import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://tivcwtzzhrsdfzxirjkw.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpdmN3dHp6aHJzZGZ6eGlyamt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MjM2MTMsImV4cCI6MjA5MTk5OTYxM30.BUfzNXfEobrz4CSeyBSj3I8To4F1eR-7AktC_kZfsO8';

export const PHOTO_BUCKET = 'ecfc-photos';

// Legacy — Carouge's original team id. Kept as a fallback for the very
// short window between app launch and AuthContext hydration so any code
// that reads getActiveTeamId() before login does not crash.
export const LEGACY_TEAM_ID = 'ecfc-juniors';

let activeTeamId: string | null = null;

export function setActiveTeamId(id: string | null): void {
  activeTeamId = id;
}

export function getActiveTeamId(): string {
  // We never want to silently write into the wrong team, so during the
  // pre-auth phase we still return the legacy id (read-only operations
  // will be denied by RLS anyway once it is enabled).
  return activeTeamId ?? LEGACY_TEAM_ID;
}

// Keep the named export for any code that still reads TEAM_ID directly.
// New code should call getActiveTeamId() instead.
export const TEAM_ID = LEGACY_TEAM_ID;

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
