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
import { auth, type CoachProfile, type CoachProfilePatch } from '@/storage/remote';
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
  // Multi-team actions for an already-onboarded coach.
  joinTeamByCode: (code: string) => Promise<void>;
  joinTeamByName: (teamName: string) => Promise<void>;
  switchTeam: (teamId: string) => Promise<void>;
  leaveTeam: (teamId: string) => Promise<void>;
  // Update any subset of the coach profile fields.
  updateProfile: (patch: CoachProfilePatch) => Promise<void>;
  // Replace / clear the coach's profile photo. Pass undefined to remove.
  setCoachPhoto: (uri: string | undefined) => Promise<void>;
  // Replace / clear the coach team's crest. Pass undefined to remove.
  setTeamLogo: (uri: string | undefined) => Promise<void>;
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
  joinTeamByCode: async () => {},
  joinTeamByName: async () => {},
  switchTeam: async () => {},
  leaveTeam: async () => {},
  updateProfile: async () => {},
  setCoachPhoto: async () => {},
  setTeamLogo: async () => {},
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

    const { data: sub } = auth.onAuthChange((next: Session | null) => {
      setSession(next ?? null);
      const newUid = next?.user?.id ?? null;
      const prevUid = lastUserIdRef.current;
      lastUserIdRef.current = newUid;
      if (newUid) {
        // Don't await here — the listener must return immediately so
        // signIn() resolves quickly. Profile fetch happens in the
        // background; any failure surfaces via setProfile(null) and
        // the AuthGate routes the user to OnboardingScreen.
        refreshProfile(newUid).catch(() => setProfile(null));
      } else {
        setProfile(null);
        // Identity changed (sign-out, account swap) → flush local cache so
        // the next coach starts with a clean slate and doesn't see stale
        // data from the previous account.
        if (prevUid) {
          db.resetAll().catch(() => {});
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

  const joinTeamByCode = useCallback(
    async (code: string) => {
      const userId = session?.user?.id;
      if (!userId) throw new Error('Pas de session active.');
      const found = await auth.claimTeamByCode(code);
      if (!found) {
        throw new Error('Code invalide. Vérifie auprès de ton club.');
      }
      await auth.joinTeam(userId, found.teamId);
      await auth.setActiveTeam(userId, found.teamId);
      try {
        await db.resetAll();
      } catch {}
      await refreshProfile(userId);
    },
    [session, refreshProfile],
  );

  const joinTeamByName = useCallback(
    async (teamName: string) => {
      const userId = session?.user?.id;
      if (!userId) throw new Error('Pas de session active.');
      if (!teamName.trim()) throw new Error("Nom d'équipe requis.");
      const created = await auth.createTeam(teamName, userId);
      await auth.joinTeam(userId, created.teamId);
      await auth.setActiveTeam(userId, created.teamId);
      try {
        await db.resetAll();
      } catch {}
      await refreshProfile(userId);
    },
    [session, refreshProfile],
  );

  const switchTeam = useCallback(
    async (teamId: string) => {
      const userId = session?.user?.id;
      if (!userId) return;
      if (profile && profile.teamId === teamId) return;
      await auth.setActiveTeam(userId, teamId);
      // Wipe the local cache so the new team's data hydrates fresh
      // from Supabase rather than mixing with the previous team's
      // residual entries.
      try {
        await db.resetAll();
      } catch {}
      await refreshProfile(userId);
    },
    [session, profile, refreshProfile],
  );

  const leaveTeam = useCallback(
    async (teamId: string) => {
      const userId = session?.user?.id;
      if (!userId) return;
      await auth.leaveTeam(userId, teamId);
      // If we were on the team we're leaving, fall back to another
      // membership (the refresh below picks the first one).
      if (profile?.teamId === teamId) {
        try {
          await db.resetAll();
        } catch {}
      }
      await refreshProfile(userId);
    },
    [session, profile, refreshProfile],
  );

  const updateProfile = useCallback(
    async (patch: CoachProfilePatch) => {
      const userId = session?.user?.id;
      if (!userId) return;
      await auth.updateCoach(userId, patch);
      await refreshProfile(userId);
    },
    [session, refreshProfile],
  );

  const setCoachPhoto = useCallback(
    async (uri: string | undefined) => {
      const userId = session?.user?.id;
      if (!userId) return;
      if (!uri) {
        try {
          await auth.deleteCoachPhoto(userId);
        } catch {}
        await auth.updateCoach(userId, { photoUrl: null });
      } else {
        const url = await auth.uploadCoachPhoto(userId, uri);
        await auth.updateCoach(userId, { photoUrl: url });
      }
      await refreshProfile(userId);
    },
    [session, refreshProfile],
  );

  const setTeamLogo = useCallback(
    async (uri: string | undefined) => {
      const userId = session?.user?.id;
      const teamId = profile?.teamId;
      if (!userId || !teamId) return;
      if (!uri) {
        try {
          await auth.deleteTeamLogo(teamId);
        } catch {}
        await auth.updateTeamLogoUrl(teamId, null);
      } else {
        const url = await auth.uploadTeamLogo(teamId, uri);
        await auth.updateTeamLogoUrl(teamId, url);
      }
      await refreshProfile(userId);
    },
    [session, profile, refreshProfile],
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
      joinTeamByCode,
      joinTeamByName,
      switchTeam,
      leaveTeam,
      updateProfile,
      setCoachPhoto,
      setTeamLogo,
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
      joinTeamByCode,
      joinTeamByName,
      switchTeam,
      leaveTeam,
      updateProfile,
      setCoachPhoto,
      setTeamLogo,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
