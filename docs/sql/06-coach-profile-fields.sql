-- =========================================================================
-- COACH HUB — Champs supplémentaires sur le profil coach
-- =========================================================================
-- Ajoute la photo, la fonction (rôle), le téléphone et une bio sur la
-- table des profils coachs. Idempotent (IF NOT EXISTS partout) — tu
-- peux l'exécuter sans risque même si déjà passé.
-- =========================================================================

ALTER TABLE public.ecfc_coach_profiles
  ADD COLUMN IF NOT EXISTS photo_url   text,
  ADD COLUMN IF NOT EXISTS role        text,
  ADD COLUMN IF NOT EXISTS phone       text,
  ADD COLUMN IF NOT EXISTS bio         text,
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();
