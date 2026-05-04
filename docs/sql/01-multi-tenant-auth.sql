-- =========================================================================
-- ECFC HUB — Multi-tenant auth migration
-- =========================================================================
--
-- Run this once in the Supabase SQL editor.
--
-- It adds:
--   * ecfc_teams        — one row per club / team
--   * ecfc_coach_profiles — links auth.users → team
--   * Row-Level Security on every ecfc_* table so a coach only sees the
--     data of the team they are attached to.
--
-- It also seeds the existing "Étoile Carouge FC" team with the legacy
-- team_id 'ecfc-juniors' so the data already in the database stays
-- available, and creates a one-time claim code that Julien Fustier can
-- use the first time he opens the app to attach his account to that
-- team.
--
-- After this migration:
--   * Julien creates an account in the app, picks "J'ai un code" and
--     enters CAROUGE-FUSTIER-2026 → his account is linked to Carouge,
--     all Carouge data appears.
--   * Any other coach signs up, picks "Créer une équipe", types a name
--     → a fresh empty team is created for them.
-- =========================================================================

-- Make sure the gen_random_uuid() helper is available (supabase enables
-- pgcrypto by default; the IF NOT EXISTS keeps this idempotent).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Teams
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ecfc_teams (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  claim_code   text UNIQUE,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ecfc_teams (id, name, claim_code)
VALUES ('ecfc-juniors', 'Étoile Carouge FC', 'CAROUGE-FUSTIER-2026')
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      claim_code = COALESCE(public.ecfc_teams.claim_code, EXCLUDED.claim_code);

-- ---------------------------------------------------------------------
-- 2. Coach profiles
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ecfc_coach_profiles (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  team_id      text NOT NULL REFERENCES public.ecfc_teams(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ecfc_coach_profiles_team_idx
  ON public.ecfc_coach_profiles (team_id);

-- ---------------------------------------------------------------------
-- 3. RLS: profiles
-- ---------------------------------------------------------------------
ALTER TABLE public.ecfc_coach_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach reads own profile"  ON public.ecfc_coach_profiles;
DROP POLICY IF EXISTS "coach inserts own profile" ON public.ecfc_coach_profiles;
DROP POLICY IF EXISTS "coach updates own profile" ON public.ecfc_coach_profiles;

CREATE POLICY "coach reads own profile" ON public.ecfc_coach_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "coach inserts own profile" ON public.ecfc_coach_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "coach updates own profile" ON public.ecfc_coach_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 4. RLS: teams
-- ---------------------------------------------------------------------
ALTER TABLE public.ecfc_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team visible to its coaches" ON public.ecfc_teams;
DROP POLICY IF EXISTS "team visible by claim code" ON public.ecfc_teams;
DROP POLICY IF EXISTS "team insertable by authenticated user" ON public.ecfc_teams;

-- Coaches can read the team(s) they are attached to.
CREATE POLICY "team visible to its coaches" ON public.ecfc_teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM public.ecfc_coach_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Any signed-in user can read a team row by claim_code (used during the
-- onboarding "J'ai un code" flow). Without this the claim lookup would
-- be invisible to a not-yet-attached coach.
CREATE POLICY "team visible by claim code" ON public.ecfc_teams
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Any signed-in user can create a fresh team (will be linked to them
-- via ecfc_coach_profiles right after).
CREATE POLICY "team insertable by authenticated user" ON public.ecfc_teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- ---------------------------------------------------------------------
-- 5. Helper: a function that returns the team_id of the current user.
--    Used by all ecfc_* RLS policies below.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_team_id()
  RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT team_id FROM public.ecfc_coach_profiles WHERE user_id = auth.uid()
  $$;

GRANT EXECUTE ON FUNCTION public.current_team_id() TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. RLS on every ecfc_* business table.
--    Each policy says: row is visible / writable iff team_id matches the
--    coach's team.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'ecfc_players',
    'ecfc_sessions',
    'ecfc_match_events',
    'ecfc_player_stints',
    'ecfc_saved_formations',
    'ecfc_saved_teams'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format('DROP POLICY IF EXISTS "team-scoped read" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "team-scoped write" ON public.%I', tbl);

    EXECUTE format(
      'CREATE POLICY "team-scoped read" ON public.%I FOR SELECT USING (team_id = public.current_team_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "team-scoped write" ON public.%I FOR ALL USING (team_id = public.current_team_id()) WITH CHECK (team_id = public.current_team_id())',
      tbl
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 7. Attendances table — no team_id column, scoped by session.
-- ---------------------------------------------------------------------
ALTER TABLE public.ecfc_attendances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team-scoped read"  ON public.ecfc_attendances;
DROP POLICY IF EXISTS "team-scoped write" ON public.ecfc_attendances;

CREATE POLICY "team-scoped read" ON public.ecfc_attendances
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM public.ecfc_sessions
      WHERE team_id = public.current_team_id()
    )
  );

CREATE POLICY "team-scoped write" ON public.ecfc_attendances
  FOR ALL USING (
    session_id IN (
      SELECT id FROM public.ecfc_sessions
      WHERE team_id = public.current_team_id()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.ecfc_sessions
      WHERE team_id = public.current_team_id()
    )
  );

-- ---------------------------------------------------------------------
-- 8. Storage policy for the photos bucket.
--    A coach can read / write any object whose key starts with their
--    team_id.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'ecfc-photos') THEN
    -- Drop any previous policies we may have installed.
    DROP POLICY IF EXISTS "ecfc photos read"   ON storage.objects;
    DROP POLICY IF EXISTS "ecfc photos write"  ON storage.objects;
    DROP POLICY IF EXISTS "ecfc photos delete" ON storage.objects;

    CREATE POLICY "ecfc photos read" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'ecfc-photos'
        AND split_part(name, '/', 1) = public.current_team_id()
      );

    CREATE POLICY "ecfc photos write" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'ecfc-photos'
        AND split_part(name, '/', 1) = public.current_team_id()
      );

    CREATE POLICY "ecfc photos delete" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'ecfc-photos'
        AND split_part(name, '/', 1) = public.current_team_id()
      );
  END IF;
END $$;

-- =========================================================================
-- Done. Reminder:
--   * Tell Julien to use claim code  CAROUGE-FUSTIER-2026
--   * If you ever need to rotate it: UPDATE public.ecfc_teams
--                                       SET claim_code = '<new>'
--                                       WHERE id = 'ecfc-juniors';
-- =========================================================================
