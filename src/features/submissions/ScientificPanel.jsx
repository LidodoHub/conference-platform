import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import SubmissionForm from '../submissions/SubmissionForm'
import ReviewForm from '../reviews/ReviewForm'
import { SUBMISSION_BADGE, SUBMISSION_LABELS } from '../../lib/constants'
import EmptyState from '../../components/ui/EmptyState'

const REC_TO_STATUS = { accept: 'accepted', reject: 'rejected', revise: 'revision_requested' }
const REC_LABELS = {
  accept: 'Recommande d\'accepter',
  reject: 'Recommande de rejeter',
  revise: 'Recommande une révision',
}

export default function ScientificPanel({
  eventId,
  submissions,
  participants,
  isOrganizer,
  isReviewer,
  isAdmin,
  onRefresh,
}) {
  const [showForm, setShowForm] = useState(false)
  const [reviewingId, setReviewingId] = useState(null)
  const [error, setError] = useState(null)

  // seul un reviewer écrit une review ; seul l'organizer tranche et supprime
  const canReview = isReviewer
  const canDecide = isOrganizer || isAdmin

  const decide = async (submissionId, status) => {
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()

    const { error: decisionError } = await supabase.from('decisions').insert({
      submission_id: submissionId,
      decided_by: user.id,
      status,
    })
    if (decisionError) {
      setError(decisionError.message)
      return
    }

    const { error: updateError } = await supabase
      .from('submissions')
      .update({ status })
      .eq('id', submissionId)
    if (updateError) {
      setError(updateError.message)
      return
    }

    onRefresh()
  }

  const handleDelete = async (submissionId) => {
    if (!window.confirm('Supprimer cette soumission ? Ses reviews et sa décision seront supprimées aussi.')) return
    setError(null)

    const { data, error: deleteError } = await supabase
      .from('submissions')
      .delete()
      .eq('id', submissionId)
      .select('id')

    if (deleteError) {
      setError(deleteError.message)
    } else if (!data || data.length === 0) {
      const msg = 'Suppression refusée : aucune ligne supprimée (policy RLS).'
      setError(msg)
    } else {
      onRefresh()
    }
  }

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <p className="section-label">Cycle scientifique</p>
          <h2 className="section-heading text-xl mt-1">Soumissions et décisions</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className={showForm ? 'btn-outline btn-sm' : 'btn-ghost-gold btn-sm'}
        >
          {showForm ? 'Annuler' : 'Soumettre un article'}
        </button>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}

      {showForm && (
        <div className="mb-6">
          <SubmissionForm
            eventId={eventId}
            onSubmitted={() => {
              setShowForm(false)
              onRefresh()
            }}
          />
        </div>
      )}

      {submissions.length === 0 ? (
        <EmptyState title="Aucune soumission" body="Les auteurs déposent ici titre et résumé." />
      ) : (
        <ul className="space-y-4">
          {submissions.map((s) => (
            <li key={s.id} className="submission-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-display font-semibold text-ink leading-snug">{s.title}</h3>
                <span className={SUBMISSION_BADGE[s.status] || 'badge-submitted'}>
                  {SUBMISSION_LABELS[s.status] || s.status}
                </span>
              </div>
              {s.abstract && <p className="text-sm text-taupe mt-3 leading-relaxed">{s.abstract}</p>}
              <p className="font-mono text-xs text-taupe/70 mt-3">
                {s.profiles?.full_name}
                {s.submitted_at && <> · {s.submitted_at.split('T')[0]}</>}
              </p>

              {canDecide && s.reviews?.some((r) => r.recommendation) && (
                <div className="mt-4 pt-3 border-t border-dashed border-taupe/30">
                  <p className="section-label mb-2">Recommandations des reviewers</p>
                  <ul className="space-y-2">
                    {s.reviews.filter((r) => r.recommendation).map((r) => (
                      <li key={r.id} className="text-sm flex flex-wrap items-baseline gap-2">
                        <span className="font-mono text-xs text-taupe">
                          {participants.find((p) => p.user_id === r.reviewer_id)?.profiles?.full_name || 'Reviewer'}
                        </span>
                        <span className={SUBMISSION_BADGE[REC_TO_STATUS[r.recommendation]] || 'badge-submitted'}>
                          {REC_LABELS[r.recommendation]}
                        </span>
                        <span className="font-mono text-xs text-taupe/70">score {r.score}/5</span>
                        {r.comments && <span className="text-taupe">— {r.comments}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-4">
                {s.status === 'submitted' && canReview && (
                  <button
                    type="button"
                    className="btn-ghost-gold btn-sm"
                    onClick={() => setReviewingId(reviewingId === s.id ? null : s.id)}
                  >
                    {reviewingId === s.id ? 'Fermer la review' : 'Faire une review'}
                  </button>
                )}
                {canDecide && s.status === 'submitted' && (
                  <>
                    <button type="button" className="btn-success btn-sm" onClick={() => decide(s.id, 'accepted')}>Accepter</button>
                    <button type="button" className="btn-danger btn-sm" onClick={() => decide(s.id, 'rejected')}>Rejeter</button>
                    <button type="button" className="btn-outline btn-sm" onClick={() => decide(s.id, 'revision_requested')}>Révision</button>
                  </>
                )}
                {canDecide && (
                  <button type="button" className="btn-danger btn-sm" onClick={() => handleDelete(s.id)}>
                    Supprimer
                  </button>
                )}
              </div>

              {reviewingId === s.id && (
                <ReviewForm
                  submissionId={s.id}
                  onReviewed={() => {
                    setReviewingId(null)
                    onRefresh()
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}