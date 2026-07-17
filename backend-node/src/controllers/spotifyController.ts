import { Request, Response } from 'express';
import { ENV } from '../config/env';

// In-memory token storage (for hackathon purposes; in production, associate with user DB)
let spotifyTokens: { accessToken: string | null; refreshToken: string | null; expiresAt: number } = {
  accessToken: null,
  refreshToken: null,
  expiresAt: 0,
};

export const spotifyController = {
  /**
   * GET /api/spotify/login
   * Redirects to Spotify Authorization page.
   */
  login: (req: Request, res: Response) => {
    const scope = 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state user-read-currently-playing';
    
    const queryParams = new URLSearchParams({
      response_type: 'code',
      client_id: ENV.SPOTIFY_CLIENT_ID,
      scope: scope,
      redirect_uri: ENV.SPOTIFY_REDIRECT_URI,
    });

    res.redirect(`https://accounts.spotify.com/authorize?${queryParams.toString()}`);
  },

  /**
   * GET /api/spotify/callback
   * Exchanges code for tokens.
   */
  callback: async (req: Request, res: Response) => {
    const code = req.query.code as string || null;
    const error = req.query.error as string || null;

    if (error) {
      return res.redirect(`${ENV.FRONTEND_ORIGIN}/workout?error=${error}`);
    }

    if (!code) {
      return res.redirect(`${ENV.FRONTEND_ORIGIN}/workout?error=no_code`);
    }

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${ENV.SPOTIFY_CLIENT_ID}:${ENV.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
        },
        body: new URLSearchParams({
          code: code,
          redirect_uri: ENV.SPOTIFY_REDIRECT_URI,
          grant_type: 'authorization_code',
        }).toString()
      });

      const data = await response.json();

      if (data.access_token) {
        spotifyTokens.accessToken = data.access_token;
        spotifyTokens.refreshToken = data.refresh_token;
        spotifyTokens.expiresAt = Date.now() + (data.expires_in * 1000);
        
        // Redirect back to frontend
        return res.redirect(`${ENV.FRONTEND_ORIGIN}/workout`);
      } else {
        return res.redirect(`${ENV.FRONTEND_ORIGIN}/workout?error=invalid_token`);
      }
    } catch (err) {
      console.error('Spotify token exchange failed', err);
      return res.redirect(`${ENV.FRONTEND_ORIGIN}/workout?error=server_error`);
    }
  },

  /**
   * Internal helper to refresh token if expired
   */
  async ensureToken() {
    if (!spotifyTokens.accessToken) return null;

    // Refresh if within 5 minutes of expiration
    if (Date.now() > spotifyTokens.expiresAt - 300000 && spotifyTokens.refreshToken) {
      try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${ENV.SPOTIFY_CLIENT_ID}:${ENV.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: spotifyTokens.refreshToken,
          }).toString()
        });

        const data = await response.json();
        if (data.access_token) {
          spotifyTokens.accessToken = data.access_token;
          spotifyTokens.expiresAt = Date.now() + (data.expires_in * 1000);
          if (data.refresh_token) {
            spotifyTokens.refreshToken = data.refresh_token;
          }
        }
      } catch (err) {
        console.error('Failed to refresh Spotify token', err);
      }
    }
    return spotifyTokens.accessToken;
  },

  /**
   * GET /api/spotify/status
   */
  status: (req: Request, res: Response) => {
    res.json({ connected: !!spotifyTokens.accessToken });
  },

  /**
   * GET /api/spotify/token
   * Returns the raw access token so the frontend Web Playback SDK can initialize.
   */
  token: async (req: Request, res: Response) => {
    const token = await spotifyController.ensureToken();
    if (!token) return res.status(401).json({ error: 'Not connected' });
    res.json({ token });
  },

  /**
   * GET /api/spotify/player
   */
  player: async (req: Request, res: Response) => {
    const token = await spotifyController.ensureToken();
    if (!token) return res.status(401).json({ error: 'Not connected' });

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 204 || response.status === 202) {
        return res.json({ is_playing: false, item: null });
      }
      
      const text = await response.text();
      if (!response.ok) {
        console.error('Spotify Player API Error:', response.status, text);
        return res.status(response.status).json({ error: 'Spotify API error' });
      }
      
      if (!text) {
        return res.json({ is_playing: false, item: null });
      }

      res.json(JSON.parse(text));
    } catch (err) {
      console.error('Failed to fetch player:', err);
      res.status(500).json({ error: 'Failed to fetch player' });
    }
  },

  /**
   * GET /api/spotify/logout
   */
  logout: (req: Request, res: Response) => {
    spotifyTokens.accessToken = null;
    spotifyTokens.refreshToken = null;
    spotifyTokens.expiresAt = 0;
    res.json({ success: true });
  },

  /**
   * POST /api/spotify/player/pause
   */
  pause: async (req: Request, res: Response) => {
    const token = await spotifyController.ensureToken();
    if (!token) return res.status(401).json({ error: 'Not connected' });

    try {
      await fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to pause' });
    }
  },

  /**
   * POST /api/spotify/player/play
   */
  play: async (req: Request, res: Response) => {
    const token = await spotifyController.ensureToken();
    if (!token) return res.status(401).json({ error: 'Not connected' });

    try {
      await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to play' });
    }
  },

  /**
   * POST /api/spotify/player/next
   */
  next: async (req: Request, res: Response) => {
    const token = await spotifyController.ensureToken();
    if (!token) return res.status(401).json({ error: 'Not connected' });

    try {
      await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to skip' });
    }
  }
};
