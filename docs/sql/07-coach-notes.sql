-- =========================================================================
-- COACH HUB — Notes du coach
-- =========================================================================
-- Crée la table ecfc_coach_notes : chaque coach peut y stocker autant
-- de notes qu'il le souhaite. Visibles uniquement par lui (RLS).
--
-- À exécuter une seule fois dans le SQL editor du projet
-- `qrkhlohmycrjlscsqpps`.
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.ecfc_coach_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ecfc_coach_notes_user_idx
  ON public.ecfc_coach_notes (user_id, created_at DESC);

ALTER TABLE public.ecfc_coach_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach reads own notes"  ON public.ecfc_coach_notes;
DROP POLICY IF EXISTS "coach writes own notes" ON public.ecfc_coach_notes;

CREATE POLICY "coach reads own notes" ON public.ecfc_coach_notes
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "coach writes own notes" ON public.ecfc_coach_notes
  FOR ALL  USING (user_id = auth.uid())
           WITH CHECK (user_id = auth.uid());
