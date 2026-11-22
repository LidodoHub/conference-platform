-- 003_review_confidential_notes.sql
-- Isole les remarques confidentielles du comité (Section E4) dans une table dédiée avec RLS stricte
-- afin d'empêcher toute fuite vers les auteurs des articles scientifiques.
-- À exécuter dans le SQL Editor de Supabase.

BEGIN;

CREATE TABLE IF NOT EXISTS public.review_chair_notes (
  review_id uuid PRIMARY KEY REFERENCES public.reviews(id) ON DELETE CASCADE,
  notes text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.review_chair_notes ENABLE ROW LEVEL SECURITY;

-- 1. LECTURE : Strictement réservée au reviewer auteur de l'avis et aux organisateurs de l'événement (is_event_organizer).
--    Les auteurs des articles ne peuvent JAMAIS lire cette table.
DROP POLICY IF EXISTS "chair_notes_select_authorized" ON public.review_chair_notes;
CREATE POLICY "chair_notes_select_authorized"
  ON public.review_chair_notes
  FOR SELECT
  TO authenticated
  USING (
    -- Est le reviewer auteur de l'évaluation
    EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.id = review_chair_notes.review_id
        AND r.reviewer_id = auth.uid()
    )
    OR
    -- Est organisateur ou co-organisateur de la conférence (via fonction SECURITY DEFINER sécurisée)
    EXISTS (
      SELECT 1 FROM public.reviews r
      JOIN public.submissions s ON s.id = r.submission_id
      WHERE r.id = review_chair_notes.review_id
        AND public.is_event_organizer(s.event_id)
    )
    OR
    -- Est administrateur de la plateforme
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 2. ÉCRITURE (INSERT / UPDATE) : Strictement réservée au reviewer qui rédige l'avis.
DROP POLICY IF EXISTS "chair_notes_insert_reviewer" ON public.review_chair_notes;
CREATE POLICY "chair_notes_insert_reviewer"
  ON public.review_chair_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.id = review_chair_notes.review_id
        AND r.reviewer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chair_notes_update_reviewer" ON public.review_chair_notes;
CREATE POLICY "chair_notes_update_reviewer"
  ON public.review_chair_notes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.id = review_chair_notes.review_id
        AND r.reviewer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.id = review_chair_notes.review_id
        AND r.reviewer_id = auth.uid()
    )
  );

-- 3. SUPPRESSION : Reviewer ou organisateurs/admins
DROP POLICY IF EXISTS "chair_notes_delete_authorized" ON public.review_chair_notes;
CREATE POLICY "chair_notes_delete_authorized"
  ON public.review_chair_notes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.id = review_chair_notes.review_id
        AND r.reviewer_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.reviews r
      JOIN public.submissions s ON s.id = r.submission_id
      WHERE r.id = review_chair_notes.review_id
        AND public.is_event_organizer(s.event_id)
    )
    OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

COMMIT;
