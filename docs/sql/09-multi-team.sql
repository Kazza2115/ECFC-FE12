-- =========================================================================
-- COACH HUB — Plusieurs équipes par coach
-- =========================================================================
-- Avant : un coach (`ecfc_coach_profiles`) = une seule équipe via
-- `team_id`. Trop limitant : un coach gère souvent plusieurs catégories
-- (U13 + U15, séniors + juniors, etc.).
--
-- Après : un profil minimal (display_name, photo, active_team_id),
-- une table de jointure `ecfc_coach_teams` qui lie un coach à 1..N
-- équipes, et `current_team_id()` lit l'`active_team_id` du profil
-- (avec fallback à la première équipe rejointe).
--
-- À exécuter dans le SQL editor du projet `qrkhlohmycrjlscsqpps`.
-- Idempotent.
-- =========================================================================

-- ---------------------------------------------------------------------
-- 1. Table de jointure coach <-> équipes
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ecfc_coach_teams (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id     text NOT NULL REFERENCES public.ecfc_teams(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'coach',
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, team_id)
);

CREATE INDEX IF NOT EXISTS ecfc_coach_teams_user_idx
  ON public.ecfc_coach_teams (user_id);
CREATE INDEX IF NOT EXISTS ecfc_coach_teams_team_idx
  ON public.ecfc_coach_teams (team_id);

-- ---------------------------------------------------------------------
-- 2. Active team sur le profil
-- ---------------------------------------------------------------------

ALTER TABLE public.ecfc_coach_profiles
  ADD COLUMN IF NOT EXISTS active_team_id text
    REFERENCES public.ecfc_teams(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- 3. Backfill : convertir l'existant en multi-team
-- ---------------------------------------------------------------------

-- Recopier l'unique team_id existant dans la nouvelle table.
INSERT INTO public.ecfc_coach_teams (user_id, team_id, role)
SELECT user_id, team_id, 'coach'
  FROM public.ecfc_coach_profiles
  WHERE team_id IS NOT NULL
ON CONFLICT (user_id, team_id) DO NOTHING;

-- L'équipe active par défaut est l'unique équipe que le coach a déjà.
UPDATE public.ecfc_coach_profiles
   SET active_team_id = team_id
 WHERE active_team_id IS NULL
   AND team_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 4. RLS sur ecfc_coach_teams
-- ---------------------------------------------------------------------

ALTER TABLE public.ecfc_coach_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach reads own memberships"   ON public.ecfc_coach_teams;
DROP POLICY IF EXISTS "coach inserts own memberships" ON public.ecfc_coach_teams;
DROP POLICY IF EXISTS "coach deletes own memberships" ON public.ecfc_coach_teams;

CREATE POLICY "coach reads own memberships" ON public.ecfc_coach_teams
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "coach inserts own memberships" ON public.ecfc_coach_teams
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "coach deletes own memberships" ON public.ecfc_coach_teams
  FOR DELETE USING (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 5. ecfc_teams : visible si le coach est dans la jointure
--    (avant : on lisait team_id sur ecfc_coach_profiles)
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "team visible to its coaches" ON public.ecfc_teams;

CREATE POLICY "team visible to its coaches" ON public.ecfc_teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM public.ecfc_coach_teams
      WHERE user_id = auth.uid()
    )
  );

-- Garder la policy "team visible by claim code" (pour l'onboarding) intacte.
-- Garder la policy "team insertable by authenticated user" intacte.
-- Garder la policy UPDATE existante (mais elle scrute encore l'ancienne
-- relation via current_team_id, ce qui marche toujours).

-- ---------------------------------------------------------------------
-- 6. current_team_id() : lit l'active_team_id, sinon la 1re jointure
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_team_id()
  RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT COALESCE(
      (SELECT active_team_id
         FROM public.ecfc_coach_profiles
        WHERE user_id = auth.uid()),
      (SELECT team_id
         FROM public.ecfc_coach_teams
        WHERE user_id = auth.uid()
        ORDER BY created_at ASC
        LIMIT 1)
    )
  $$;

GRANT EXECUTE ON FUNCTION public.current_team_id() TO anon, authenticated;

-- =========================================================================
-- Note : la colonne `team_id` de ecfc_coach_profiles n'est pas
-- supprimée. Elle reste en lecture seule pour la compatibilité
-- (anciens clients). Le code récent ne s'en sert plus — il consulte
-- ecfc_coach_teams + active_team_id.
-- =========================================================================
