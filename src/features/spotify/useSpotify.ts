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

export interface SpotifyPlayResult {
  ok: boolean;
  error?: string;
}

/** Accepts a bare Spotify track ID, a full `spotify:track:...` URI, or an
 * open.spotify.com URL — with or without the `?si=...` share-tracking suffix Spotify's
 * own "Share" menu appends — and normalizes down to the bare ID. A raw `?si=...` suffix
 * pasted straight into a track-ID field silently breaks playback (the `spotify:track:`
 * URI scheme takes no query string at all), which is exactly the kind of paste mistake a
 * host filling in a track ID field is likely to make. */
const normalizeTrackId = (raw: string): string => {
  const trimmed = raw.trim();
  const urlMatch = trimmed.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];
  const uriMatch = trimmed.match(/spotify:track:([a-zA-Z0-9]+)/);
  if (uriMatch) return uriMatch[1];
  return trimmed.split('?')[0].split('&')[0];
};

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

  /** Resolves to `{ ok: false, error }` instead of throwing/swallowing on failure —
   * callers that only care about "fire and forget" (most do, `void spotify.play(...)`)
   * are unaffected, but callers that want to surface *why* a track didn't play (e.g. a
   * malformed ID, an unavailable track, no active device) now can. Previously any
   * non-2xx response from Spotify was silently ignored — a real cause of "connected,
   * device found, but the actual song just doesn't play" with zero diagnostic signal. */
  const play = useCallback(async (trackId: string, positionMs: number): Promise<SpotifyPlayResult> => {
    if (!token) return { ok: false, error: 'Not connected to Spotify.' };
    const id = normalizeTrackId(trackId);
    const deviceParam = activeDeviceId ? `?device_id=${activeDeviceId}` : '';
    const res = await spotifyFetch(token, `/me/player/play${deviceParam}`, {
      method: 'PUT',
      body: JSON.stringify({ uris: [`spotify:track:${id}`], position_ms: positionMs }),
    });
    if (res.ok) return { ok: true };
    const body = await res.text().catch(() => '');
    console.warn(`[Spotify] play(${id}) failed: ${res.status} ${body}`);
    const hint = res.status === 404 ? 'track not found — check the ID'
      : res.status === 403 ? 'restricted — needs Premium, or track unavailable in this account/region'
        : res.status === 502 ? 'no active device — open Spotify and start playing something first'
          : 'see console for details';
    return { ok: false, error: `Spotify error ${res.status} (${hint})` };
  }, [token, activeDeviceId]);

  const pause = useCallback(async () => {
    if (!token) return;
    await spotifyFetch(token, '/me/player/pause', { method: 'PUT' });
  }, [token]);

  const resume = useCallback(async () => {
    if (!token) return;
    const deviceParam = activeDeviceId ? `?device_id=${activeDeviceId}` : '';
    await spotifyFetch(token, `/me/player/play${deviceParam}`, { method: 'PUT' });
  }, [token, activeDeviceId]);

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

  return { isConnected, devices, activeDeviceId, setActiveDeviceId, fetchDevices, play, pause, resume, stop, disconnect };
};
