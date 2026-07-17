export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private videoInterval: number | null = null;
  private isConnected = false;

  constructor(
    private videoElement: HTMLVideoElement,
    private onMessage: (msg: string) => void
  ) {}

  async connect() {
    if (this.isConnected) return;

    // Connect to our backend proxy
    this.ws = new WebSocket('ws://localhost:8080/api/gemini-live');
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = async () => {
      console.log('🔗 Connected to Gemini Live via proxy');
      this.isConnected = true;
      this.onMessage('Voice Coach connected. Say hi!');
      
      // Start streaming audio and video
      await this.startAudioStream();
      this.startVideoStream();
    };

    this.ws.onmessage = async (event) => {
      try {
        const data = event.data instanceof ArrayBuffer 
          ? new TextDecoder().decode(event.data) 
          : event.data as string;
          
        const response = JSON.parse(data);

        // Handle ServerContent (text/audio from Gemini)
        if (response.serverContent?.modelTurn?.parts) {
          const parts = response.serverContent.modelTurn.parts;
          for (const part of parts) {
            // Handle Audio output
            if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
              this.playAudioBase64(part.inlineData.data);
            }
          }
        }
      } catch (err) {
        console.error('Error parsing Gemini message', err);
      }
    };

    this.ws.onclose = () => {
      console.log('🔌 Disconnected from Gemini Live');
      this.disconnect();
    };
  }

  private async startAudioStream() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create an inline AudioWorklet to extract PCM16 data
      const workletCode = `
        class PCMProcessor extends AudioWorkletProcessor {
          process(inputs) {
            const input = inputs[0];
            if (input.length > 0) {
              const channelData = input[0];
              const pcm16 = new Int16Array(channelData.length);
              for (let i = 0; i < channelData.length; i++) {
                let s = Math.max(-1, Math.min(1, channelData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              this.port.postMessage(pcm16.buffer);
            }
            return true;
          }
        }
        registerProcessor('pcm-processor', PCMProcessor);
      `;
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      await this.audioContext.audioWorklet.addModule(URL.createObjectURL(blob));

      const processor = new AudioWorkletNode(this.audioContext, 'pcm-processor');
      source.connect(processor);
      processor.connect(this.audioContext.destination);

      processor.port.onmessage = (e) => {
        if (!this.isConnected || !this.ws) return;
        const pcmBuffer = e.data as ArrayBuffer;
        const base64Data = this.arrayBufferToBase64(pcmBuffer);
        
        // Send RealtimeInput Audio Chunk
        const msg = {
          realtimeInput: {
            audio: {
              mimeType: 'audio/pcm;rate=16000',
              data: base64Data
            }
          }
        };
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(msg));
        }
      };
    } catch (err) {
      console.error('Failed to start audio stream:', err);
    }
  }

  private startVideoStream() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Send 1 frame per second to Gemini to save bandwidth
    this.videoInterval = window.setInterval(() => {
      if (!this.isConnected || !this.ws || !this.videoElement) return;
      if (this.videoElement.videoWidth === 0) return;

      canvas.width = this.videoElement.videoWidth;
      canvas.height = this.videoElement.videoHeight;
      ctx?.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const base64Data = dataUrl.split(',')[1];

      const msg = {
        realtimeInput: {
          video: {
            mimeType: 'image/jpeg',
            data: base64Data
          }
        }
      };
      
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(msg));
      }
    }, 1000);
  }

  // --- Audio Playback Helpers ---

  // Queue of audio chunks to play sequentially
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private playbackContext = new AudioContext({ sampleRate: 24000 }); // Gemini returns 24kHz PCM

  private playAudioBase64(base64: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    // Convert Int16 (Little Endian) to Float32
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    const audioBuffer = this.playbackContext.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);
    
    this.audioQueue.push(audioBuffer);
    if (!this.isPlaying) {
      this.playNextAudio();
    }
  }

  private playNextAudio() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }
    this.isPlaying = true;
    const buffer = this.audioQueue.shift()!;
    const source = this.playbackContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.playbackContext.destination);
    source.onended = () => this.playNextAudio();
    source.start(0);
  }

  // --- Utils ---

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  disconnect() {
    this.isConnected = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.videoInterval) {
      clearInterval(this.videoInterval);
      this.videoInterval = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.onMessage('Voice Coach disconnected.');
  }
}
