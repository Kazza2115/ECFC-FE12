import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tivcwtzzhrsdfzxirjkw.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpdmN3dHp6aHJzZGZ6eGlyamt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MjM2MTMsImV4cCI6MjA5MTk5OTYxM30.BUfzNXfEobrz4CSeyBSj3I8To4F1eR-7AktC_kZfsO8';

export const TEAM_ID = 'ecfc-juniors';
export const PHOTO_BUCKET = 'ecfc-photos';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
