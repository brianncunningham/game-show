import { useCallback, useEffect, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string;
const SCOPES = 'user-read-playback-state user-modify-playback-state';
const STORAGE_KEY = 'spotify_access_token';
const EXPIRY_KEY = 'spotify_token_expiry';
const VERIFIER_KEY = 'spotify_code_verifier';

const getRedirectUri = () => `${window.location.origin}/host`;

// --- PKCE helpers ---
const randomBytes = (len: number) => {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return arr;
};

const base64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf instanceof ArrayBuffer ? buf : buf.buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const sha256 = async (plain: string) => {
  const enc = new TextEncoder().encode(plain);
  return crypto.subtle.digest('SHA-256', enc);
};

export const initiateSpotifyLogin = async () => {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(await sha256(verifier));
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
};

const exchangeCode = async (code: string): Promise<{ access_token: string; expires_in: number } | null> => {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) return null;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectUri(),
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) return null;
  sessionStorage.removeItem(VERIFIER_KEY);
  return res.json() as Promise<{ access_token: string; expires_in: number }>;
};

const refreshToken = async (token: string): Promise<string | null> => {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      access_token: token,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json() as { access_token: string; expires_in: number };
  localStorage.setItem(STORAGE_KEY, data.access_token);
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + data.expires_in * 1000));
  return data.access_token;
};

const getStoredToken = (): string | null => {
  const token = localStorage.getItem(STORAGE_KEY);
  const expiry = Number(localStorage.getItem(EXPIRY_KEY) ?? 0);
  if (!token || Date.now() > expiry - 60_000) return null;
  return token;
};

// --- Spotify API calls ---
const spotifyFetch = async (token: string, path: string, options?: RequestInit) =>
  fetch(`https://api.spotify.com/v1${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  });

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

// --- Hook ---
export const useSpotify = () => {
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Handle OAuth callback code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;

    // Remove code from URL cleanly
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    window.history.replaceState({}, '', url.toString());

    void (async () => {
      const data = await exchangeCode(code);
      if (!data) return;
      localStorage.setItem(STORAGE_KEY, data.access_token);
      localStorage.setItem(EXPIRY_KEY, String(Date.now() + data.expires_in * 1000));
      setToken(data.access_token);
    })();
  }, []);

  const fetchDevices = useCallback(async () => {
    if (!token) return;
    const res = await spotifyFetch(token, '/me/player/devices');
    if (!res.ok) return;
    const data = await res.json() as { devices: SpotifyDevice[] };
    setDevices(data.devices ?? []);
    setActiveDeviceId(prev => prev ?? data.devices.find(d => d.is_active)?.id ?? data.devices[0]?.id ?? null);
  }, [token]);

  // Fetch devices when token is available
  useEffect(() => {
    if (!token) { setIsConnected(false); return; }
    setIsConnected(true);
    void fetchDevices();
  }, [token, fetchDevices]);

  const play = useCallback(async (trackId: string, positionMs: number) => {
    if (!token) return;
    if (activeDeviceId) {
      // Explicit device selected in dropdown — send directly to it
      await spotifyFetch(token, `/me/player/play?device_id=${activeDeviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [`spotify:track:${trackId}`], position_ms: positionMs }),
      });
    } else {
      // No device selected — add to queue on whatever is currently active (e.g. Sonos via Connect)
      // then skip to it so it plays immediately from the right position
      await spotifyFetch(token, `/me/player/queue?uri=spotify:track:${trackId}`, { method: 'POST' });
      await new Promise(r => setTimeout(r, 300));
      await spotifyFetch(token, '/me/player/next', { method: 'POST' });
      if (positionMs > 0) {
        await new Promise(r => setTimeout(r, 800));
        await spotifyFetch(token, '/me/player/seek?position_ms=' + positionMs, { method: 'PUT' });
      }
    }
  }, [token, activeDeviceId]);

  const pause = useCallback(async () => {
    if (!token) return;
    await spotifyFetch(token, '/me/player/pause', { method: 'PUT' });
  }, [token]);

  const stop = useCallback(async () => {
    await pause();
  }, [pause]);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    setToken(null);
    setIsConnected(false);
    setDevices([]);
    setActiveDeviceId(null);
  }, []);

  return { isConnected, devices, activeDeviceId, setActiveDeviceId, fetchDevices, play, pause, stop, disconnect };
};
