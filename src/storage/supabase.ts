import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://qrkhlohmycrjlscsqpps.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya2hsb2hteWNyamxzY3NxcHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTEwMDEsImV4cCI6MjA5MzQ2NzAwMX0.3npiqutbtbSPDEHesoaKukv-rV30R6pL2FCwR9CP_B4';

export const PHOTO_BUCKET = 'ecfc-photos';

// Sentinel value returned by getActiveTeamId() before a coach has
// signed in / claimed a team. It deliberately matches no real team
// row, so any read or write that escapes through it is rejected by
// Supabase RLS — a noisy failure is much safer than a silent leak.
const UNATTACHED_TEAM_ID = '__unattached__';

let activeTeamId: string | null = null;

export function setActiveTeamId(id: string | null): void {
  activeTeamId = id;
}

export function getActiveTeamId(): string {
  return activeTeamId ?? UNATTACHED_TEAM_ID;
}

// Auth session storage. AsyncStorage on native, localStorage on web —
// the same backend our `kv` helper uses, so the user stays signed in
// across reloads on every platform.
const authStorage =
  Platform.OS === 'web'
    ? {
        getItem: (key: string) => {
          try {
            return Promise.resolve(window.localStorage.getItem(key));
          } catch {
            return Promise.resolve(null);
          }
        },
        setItem: (key: string, value: string) => {
          try {
            window.localStorage.setItem(key, value);
          } catch {}
          return Promise.resolve();
        },
        removeItem: (key: string) => {
          try {
            window.localStorage.removeItem(key);
          } catch {}
          return Promise.resolve();
        },
      }
    : AsyncStorage;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Custom storage key so this app's session never collides with
    // any other app (e.g. Trivela) that talks to the same Supabase
    // project from the same browser origin.
    storageKey: 'coachhub-auth-v1',
    storage: authStorage as any,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
