import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { auth, type CoachProfile } from '@/storage/remote';
import { setActiveTeamId } from '@/storage/supabase';
import { db } from '@/storage/database';

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  profile: CoachProfile | null;
  // Sign-in / sign-up.
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Onboarding actions (called from the OnboardingScreen).
  claimTeam: (code: string, displayName: string) => Promise<void>;
  createTeam: (teamName: string, displayName: string) => Promise<void>;
  // Update the coach name shown in the UI.
  renameCoach: (next: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  loading: true,
  session: null,
  profile: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  claimTeam: async () => {},
  createTeam: async () => {},
  renameCoach: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  // Apply the active team_id every time the profile changes so the
  // remote layer (which reads getActiveTeamId() at call time) writes
  // and reads against the right tenant.
  useEffect(() => {
    setActiveTeamId(profile?.teamId ?? null);
  }, [profile]);

  const refreshProfile = useCallback(async (userId: string) => {
    try {
      const next = await auth.fetchProfile(userId);
      setProfile(next);
    } catch {
      setProfile(null);
    }
  }, []);

  // Initial hydration + auth state subscription.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await auth.getSession();
        if (cancelled) return;
        setSession(s ?? null);
        if (s?.user?.id) {
          lastUserIdRef.current = s.user.id;
          await refreshProfile(s.user.id);
        }
      } catch {}
      if (!cancelled) setLoading(false);
    })();

    const { data: sub } = auth.onAuthChange(async (next: Session | null) => {
      setSession(next ?? null);
      const newUid = next?.user?.id ?? null;
      const prevUid = lastUserIdRef.current;
      lastUserIdRef.current = newUid;
      if (newUid) {
        await refreshProfile(newUid);
      } else {
        setProfile(null);
        // Identity changed (sign-out, account swap) → flush local cache so
        // the next coach starts with a clean slate and doesn't see stale
        // data from the previous account.
        if (prevUid) {
          try {
            await db.resetAll();
          } catch {}
        }
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    await auth.signIn(email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    await auth.signUp(email, password);
  }, []);

  const signOut = useCallback(async () => {
    await auth.signOut();
  }, []);

  const claimTeam = useCallback(
    async (code: string, displayName: string) => {
      const userId = session?.user?.id;
      if (!userId) throw new Error('Pas de session active.');
      const found = await auth.claimTeamByCode(code);
      if (!found) {
        throw new Error('Code invalide. Vérifie auprès de ton club.');
      }
      await auth.createProfile(userId, displayName, found.teamId);
      // Reset local cache so the new team's data hydrates fresh from
      // Supabase rather than reusing whatever was in localStorage.
      try {
        await db.resetAll();
      } catch {}
      await refreshProfile(userId);
    },
    [session, refreshProfile],
  );

  const createTeam = useCallback(
    async (teamName: string, displayName: string) => {
      const userId = session?.user?.id;
      if (!userId) throw new Error('Pas de session active.');
      if (!teamName.trim()) throw new Error('Nom d\'équipe requis.');
      if (!displayName.trim()) throw new Error('Nom du coach requis.');
      const created = await auth.createTeam(teamName, userId);
      await auth.createProfile(userId, displayName, created.teamId);
      try {
        await db.resetAll();
      } catch {}
      await refreshProfile(userId);
    },
    [session, refreshProfile],
  );

  const renameCoach = useCallback(
    async (next: string) => {
      const userId = session?.user?.id;
      if (!userId) return;
      await auth.updateDisplayName(userId, next);
      await refreshProfile(userId);
    },
    [session, refreshProfile],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      profile,
      signIn,
      signUp,
      signOut,
      claimTeam,
      createTeam,
      renameCoach,
    }),
    [
      loading,
      session,
      profile,
      signIn,
      signUp,
      signOut,
      claimTeam,
      createTeam,
      renameCoach,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
