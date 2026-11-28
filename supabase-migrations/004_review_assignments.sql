-- Table d'affectation explicite des reviewers aux soumissions
CREATE TABLE IF NOT EXISTS public.review_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, reviewer_id)
);

ALTER TABLE public.review_assignments ENABLE ROW LEVEL SECURITY;

-- Lecture : organisateurs/admins de l'événement, ou le reviewer lui-même
CREATE POLICY "review_assignments_select"
  ON public.review_assignments
  FOR SELECT
  USING (
    reviewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.event_participants ep
      WHERE ep.event_id = review_assignments.event_id
        AND ep.user_id = auth.uid()
        AND ep.role_in_event = 'organizer'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Insertion / suppression : organisateurs de l'événement ou admins
CREATE POLICY "review_assignments_manage"
  ON public.review_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.event_participants ep
      WHERE ep.event_id = review_assignments.event_id
        AND ep.user_id = auth.uid()
        AND ep.role_in_event = 'organizer'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_participants ep
      WHERE ep.event_id = review_assignments.event_id
        AND ep.user_id = auth.uid()
        AND ep.role_in_event = 'organizer'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
