-- =========================================================================
-- COACH HUB — Blazon de l'équipe
-- =========================================================================
-- Ajoute un champ `logo_url` sur ecfc_teams + une policy UPDATE pour
-- que les coachs puissent modifier leur(s) propre(s) équipe(s) (nom,
-- blazon).
--
-- À exécuter une fois dans le SQL editor du projet
-- `qrkhlohmycrjlscsqpps`. Idempotent.
-- =========================================================================

ALTER TABLE public.ecfc_teams
  ADD COLUMN IF NOT EXISTS logo_url   text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP POLICY IF EXISTS "team updatable by its coaches" ON public.ecfc_teams;

CREATE POLICY "team updatable by its coaches" ON public.ecfc_teams
  FOR UPDATE USING (
    id IN (
      SELECT team_id FROM public.ecfc_coach_profiles
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT team_id FROM public.ecfc_coach_profiles
      WHERE user_id = auth.uid()
    )
  );
