-- Table decisions
CREATE TABLE IF NOT EXISTS decisions (
    id              SERIAL PRIMARY KEY,
    submission_id   INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    decided_by      INTEGER NOT NULL REFERENCES profiles(id),
    status          VARCHAR(30) NOT NULL CHECK (status IN ('accepted', 'rejected', 'revision_requested')),
    notes           TEXT,
    decided_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    notified_at     TIMESTAMP
);

COMMENT ON TABLE decisions IS 'Décisions des organisateurs sur les soumissions';

-- RLS: organizer de l'event peut créer/modifier/voir toutes les décisions
CREATE POLICY organizer_decisions ON decisions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM events e
            JOIN profiles p ON p.id = e.organizer_id
            WHERE e.id = submission_id
              AND e.status = 'active'
              AND p.id = auth.uid()
        )
    );

-- RLS: auteur de la soumission peut voir SA propre décision une fois prise
CREATE POLICY author_decisions ON decisions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM submissions s
            JOIN profiles p ON p.id = s.author_id
            WHERE s.id = submission_id
              AND p.id = auth.uid()
              AND status IS NOT NULL
        )
    );

-- RLS: aucun autre utilisateur ne peut accéder
DROP POLICY IF EXISTS anon_decisions ON decisions;
CREATE POLICY anon_decisions ON decisions
    FOR SELECT
    TO anon
    WITH CHECK (false);

-- RLS: les organisateurs peuvent modifier leur propre décision
DROP POLICY IF EXISTS organizer_update ON decisions;
CREATE POLICY organizer_update ON decisions
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM events e
            JOIN profiles p ON p.id = e.organizer_id
            WHERE e.id = submission_id
              AND e.status = 'active'
              AND p.id = auth.uid()
        )
    );
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM events e
            JOIN profiles p ON p.id = e.organizer_id
            WHERE e.id = submission_id
              AND e.status = 'active'
              AND p.id = auth.uid()
        )
    );

-- RLS: les auteurs ne peuvent pas modifier les décisions (lecture seule)
DROP POLICY IF EXISTS author_update ON decisions;
CREATE POLICY author_update ON decisions
    FOR UPDATE
    TO authenticated
    USING (
        NOT EXISTS (
            SELECT 1 FROM events e
            JOIN profiles p ON p.id = e.organizer_id
            WHERE e.id = submission_id
              AND e.status = 'active'
              AND p.id = auth.uid()
        )
    );
    WITH CHECK (true);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_decisions_submission ON decisions(submission_id);
CREATE INDEX IF NOT EXISTS idx_decisions_decided_by ON decisions(decided_by);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
