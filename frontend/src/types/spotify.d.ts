export {};

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
  }

  interface SpotifyPlayer {
    connect: () => Promise<boolean>;
    disconnect: () => void;
    addListener: (eventName: string, callback: (state: any) => void) => void;
    removeListener: (eventName: string, callback?: (state: any) => void) => void;
    getCurrentState: () => Promise<SpotifyState | null>;
    setName: (name: string) => Promise<void>;
    getVolume: () => Promise<number>;
    setVolume: (volume: number) => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    togglePlay: () => Promise<void>;
    seek: (position_ms: number) => Promise<void>;
    previousTrack: () => Promise<void>;
    nextTrack: () => Promise<void>;
  }

  interface SpotifyState {
    context: {
      uri: string;
      metadata: any;
    };
    disallows: any;
    duration: number;
    paused: boolean;
    position: number;
    track_window: {
      current_track: SpotifyTrack;
      previous_tracks: SpotifyTrack[];
      next_tracks: SpotifyTrack[];
    };
  }

  interface SpotifyTrack {
    id: string;
    uri: string;
    type: string;
    uid: string;
    linked_from: {
      uri: string | null;
      id: string | null;
    };
    media_type: string;
    name: string;
    is_playable: boolean;
    album: {
      uri: string;
      name: string;
      images: { url: string; size: string }[];
    };
    artists: { uri: string; name: string }[];
  }
}
