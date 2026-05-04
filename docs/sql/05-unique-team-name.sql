-- =========================================================================
-- COACH HUB — Unicité des noms d'équipe (case-insensitive)
-- =========================================================================
-- Empêche deux coachs de créer des équipes avec un nom identique
-- (insensible à la casse). « Étoile Carouge FC », « ETOILE CAROUGE FC »
-- et « etoile carouge fc » sont considérés identiques.
--
-- À exécuter dans le SQL editor du projet `qrkhlohmycrjlscsqpps` une
-- seule fois.
-- =========================================================================

-- Si des doublons existent déjà, le CREATE UNIQUE INDEX échoue. Liste
-- les éventuels doublons d'abord :
--   SELECT lower(name) AS key, count(*) FROM public.ecfc_teams
--    GROUP BY lower(name) HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ecfc_teams_name_unique_ci
  ON public.ecfc_teams (lower(name));
