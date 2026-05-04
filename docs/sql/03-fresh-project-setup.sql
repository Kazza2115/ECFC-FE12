-- =========================================================================
-- COACH HUB — Bootstrap d'un nouveau projet Supabase
-- =========================================================================
-- Ce script crée TOUT ce dont l'app a besoin sur un projet Supabase
-- vierge :
--   1. Les tables métier (ecfc_*)
--   2. Les tables d'auth (ecfc_teams, ecfc_coach_profiles)
--   3. La fonction current_team_id() utilisée par les RLS policies
--   4. Le RLS sur toutes les tables (chaque coach ne voit que son équipe)
--   5. Le bucket Storage 'ecfc-photos' avec ses policies team-scopées
--   6. La publication Realtime sur les 7 tables métier
--   7. Une équipe « Étoile Carouge FC » pré-créée (id = ecfc-juniors)
--      avec le claim code CAROUGE-FUSTIER-2026 que tu donnes à Julien
--
-- À faire AVANT de l'exécuter :
--   • Crée un nouveau projet sur supabase.com
--   • Va dans Authentication → Providers → active Email
--   • (Optionnel pendant la phase pilote) Authentication → Providers →
--     Email → décoche « Confirm email »
--
-- À faire APRÈS l'exécution :
--   • Récupère Project URL + anon public key depuis Settings → API
--   • Donne-les-moi, je mets à jour src/storage/supabase.ts
--   • Tu peux ouvrir l'app, créer un compte, claim CAROUGE-FUSTIER-2026
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Tables métier
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ecfc_players (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  photo_url   text,
  team_id     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ecfc_players_team_idx
  ON public.ecfc_players (team_id);

CREATE TABLE IF NOT EXISTS public.ecfc_sessions (
  id                text PRIMARY KEY,
  date              date NOT NULL,
  label             text,
  kind              text,
  cancelled         boolean,
  confirmed         boolean,
  started_at        timestamptz,
  ended_at          timestamptz,
  starting_lineup   text[],
  lineup_positions  jsonb,
  formation         text,
  lineup_slots      jsonb,
  pause_intervals   jsonb,
  quarter_teams     jsonb,
  current_quarter   integer,
  team_id           text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ecfc_sessions_team_idx
  ON public.ecfc_sessions (team_id);

CREATE TABLE IF NOT EXISTS public.ecfc_attendances (
  session_id  text NOT NULL REFERENCES public.ecfc_sessions(id) ON DELETE CASCADE,
  player_id   text NOT NULL REFERENCES public.ecfc_players(id)  ON DELETE CASCADE,
  status      text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, player_id)
);
CREATE INDEX IF NOT EXISTS ecfc_attendances_session_idx
  ON public.ecfc_attendances (session_id);
CREATE INDEX IF NOT EXISTS ecfc_attendances_player_idx
  ON public.ecfc_attendances (player_id);

CREATE TABLE IF NOT EXISTS public.ecfc_match_events (
  id          text PRIMARY KEY,
  session_id  text NOT NULL REFERENCES public.ecfc_sessions(id) ON DELETE CASCADE,
  player_id   text NOT NULL REFERENCES public.ecfc_players(id)  ON DELETE CASCADE,
  type        text NOT NULL,
  minute      integer,
  note        text,
  team_id     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ecfc_match_events_team_idx
  ON public.ecfc_match_events (team_id);
CREATE INDEX IF NOT EXISTS ecfc_match_events_session_idx
  ON public.ecfc_match_events (session_id);

CREATE TABLE IF NOT EXISTS public.ecfc_player_stints (
  id          text PRIMARY KEY,
  session_id  text NOT NULL REFERENCES public.ecfc_sessions(id) ON DELETE CASCADE,
  player_id   text NOT NULL REFERENCES public.ecfc_players(id)  ON DELETE CASCADE,
  position    text,
  start_at    timestamptz NOT NULL,
  end_at      timestamptz,
  quarter     integer,
  team_id     text NOT NULL
);
CREATE INDEX IF NOT EXISTS ecfc_player_stints_team_idx
  ON public.ecfc_player_stints (team_id);
CREATE INDEX IF NOT EXISTS ecfc_player_stints_session_idx
  ON public.ecfc_player_stints (session_id);

CREATE TABLE IF NOT EXISTS public.ecfc_saved_formations (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  counts      integer[] NOT NULL,
  team_id     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ecfc_saved_formations_team_idx
  ON public.ecfc_saved_formations (team_id);

CREATE TABLE IF NOT EXISTS public.ecfc_saved_teams (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  formation   text,
  slots       jsonb NOT NULL,
  team_id     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ecfc_saved_teams_team_idx
  ON public.ecfc_saved_teams (team_id);

-- ---------------------------------------------------------------------
-- 2. Tables d'auth (équipes + profils coachs)
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

CREATE TABLE IF NOT EXISTS public.ecfc_coach_profiles (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  team_id      text NOT NULL REFERENCES public.ecfc_teams(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ecfc_coach_profiles_team_idx
  ON public.ecfc_coach_profiles (team_id);

-- ---------------------------------------------------------------------
-- 3. Helper : team_id du coach courant
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_team_id()
  RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT team_id FROM public.ecfc_coach_profiles WHERE user_id = auth.uid()
  $$;

GRANT EXECUTE ON FUNCTION public.current_team_id() TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. RLS — profils
-- ---------------------------------------------------------------------

ALTER TABLE public.ecfc_coach_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach reads own profile"   ON public.ecfc_coach_profiles;
DROP POLICY IF EXISTS "coach inserts own profile" ON public.ecfc_coach_profiles;
DROP POLICY IF EXISTS "coach updates own profile" ON public.ecfc_coach_profiles;

CREATE POLICY "coach reads own profile"   ON public.ecfc_coach_profiles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "coach inserts own profile" ON public.ecfc_coach_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "coach updates own profile" ON public.ecfc_coach_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 5. RLS — équipes
-- ---------------------------------------------------------------------

ALTER TABLE public.ecfc_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team visible to its coaches"        ON public.ecfc_teams;
DROP POLICY IF EXISTS "team visible by claim code"         ON public.ecfc_teams;
DROP POLICY IF EXISTS "team insertable by authenticated"   ON public.ecfc_teams;

CREATE POLICY "team visible to its coaches" ON public.ecfc_teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM public.ecfc_coach_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "team visible by claim code" ON public.ecfc_teams
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "team insertable by authenticated" ON public.ecfc_teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- ---------------------------------------------------------------------
-- 6. RLS — tables métier scopées par team_id
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
    EXECUTE format('DROP POLICY IF EXISTS "team-scoped read"  ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "team-scoped write" ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY "team-scoped read"  ON public.%I FOR SELECT USING (team_id = public.current_team_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "team-scoped write" ON public.%I FOR ALL USING (team_id = public.current_team_id()) WITH CHECK (team_id = public.current_team_id())',
      tbl
    );
  END LOOP;
END $$;

-- Attendances : pas de team_id, scope via session.
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
-- 7. Storage : bucket photos + RLS team-scopée
-- ---------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('ecfc-photos', 'ecfc-photos', true)
ON CONFLICT (id) DO NOTHING;

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

-- ---------------------------------------------------------------------
-- 8. Realtime : ajoute les 7 tables métier à la publication
-- ---------------------------------------------------------------------

DO $$
DECLARE
  tbl text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY ARRAY[
      'ecfc_players',
      'ecfc_sessions',
      'ecfc_attendances',
      'ecfc_match_events',
      'ecfc_player_stints',
      'ecfc_saved_formations',
      'ecfc_saved_teams'
    ] LOOP
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN others THEN NULL;
      END;
    END LOOP;
  END IF;
END $$;

-- =========================================================================
-- Fini ! Vérifie dans Table Editor que les 9 tables ecfc_* sont créées,
-- puis donne-moi l'URL et la anon key du projet pour que je mette à jour
-- src/storage/supabase.ts.
--
-- Rappel : claim code Carouge → CAROUGE-FUSTIER-2026
-- Pour le faire tourner :  UPDATE public.ecfc_teams
--                            SET claim_code = '<nouveau>'
--                            WHERE id = 'ecfc-juniors';
-- =========================================================================
