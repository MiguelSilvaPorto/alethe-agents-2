import { invoke } from '@tauri-apps/api/core';

export type NowPlaying = {
  playing: boolean;
  track: string;
  artist: string;
  album: string;
  cover_url: string | null;
  duration_ms: number;
  progress_ms: number;
  track_url: string | null;
};

export type SpotifyCredentials = {
  clientId?: string;
  clientSecret?: string;
};

export function spotifyLogin(credentials: SpotifyCredentials): Promise<void> {
  return invoke('spotify_login', credentials);
}

export function spotifyLogout(): Promise<void> {
  return invoke('spotify_logout');
}

export function spotifyStatus(): Promise<boolean> {
  return invoke<boolean>('spotify_status');
}

export function spotifyGetCurrent(
  credentials: SpotifyCredentials,
): Promise<NowPlaying | null> {
  return invoke<NowPlaying | null>('spotify_get_current', credentials);
}
