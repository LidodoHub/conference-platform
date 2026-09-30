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
  const [assigningId, setAssigningId] = useState(null)
  const [error, setError] = useState(null)

  const reviewers = participants.filter((p) => p.role_in_event === 'reviewer' || p.role_in_event === 'organizer')
  const canReview = isReviewer 
  const canAssign = isOrganizer || isAdmin

  const assign = async (submissionId, reviewerUserId) => {
    setError(null)
    const { error: insertError } = await supabase.from('reviews').insert({
      submission_id: submissionId,
      reviewer_id: reviewerUserId,
      score: 0,
      comments: 'Assignation — en attente de review',
    })
    if (insertError) {
      setError(insertError.message)
      return
    }
    setAssigningId(null)
    onRefresh()
  }

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

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <p className="section-label">Cycle scientifique</p>
          <h2 className="section-heading text-xl mt-1">Soumissions et décisions</h2>
          <p className="font-mono text-xs text-taupe/70 mb-2">
            DEBUG isOrganizer={String(isOrganizer)} · isReviewer={String(isReviewer)} · isAdmin={String(isAdmin)} · soumissions={submissions.length}
          </p>
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

              {canAssign && s.reviews?.some((r) => r.recommendation) && (
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
              <p className="font-mono text-xs text-taupe/70 mt-2">
                DEBUG statut={s.status} · reviews={s.reviews ? s.reviews.length : 'non chargées'}
              </p>
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
                {canAssign && (
                  <button
                    type="button"
                    className="btn-outline btn-sm"
                    onClick={() => setAssigningId(assigningId === s.id ? null : s.id)}
                  >
                    Assigner un reviewer
                  </button>
                )}
                {canAssign && s.status === 'submitted' && (
                  <>
                    <button type="button" className="btn-success btn-sm" onClick={() => decide(s.id, 'accepted')}>Accepter</button>
                    <button type="button" className="btn-danger btn-sm" onClick={() => decide(s.id, 'rejected')}>Rejeter</button>
                    <button type="button" className="btn-outline btn-sm" onClick={() => decide(s.id, 'revision_requested')}>Révision</button>
                  </>
                )}
              </div>

              {assigningId === s.id && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {reviewers.length === 0 && <p className="text-xs text-taupe">Promouvez d'abord un participant en reviewer.</p>}
                  {reviewers.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="btn-outline btn-sm"
                      onClick={() => assign(s.id, r.user_id)}
                      disabled={!r.user_id}
                    >
                      {r.profiles?.full_name}
                    </button>
                  ))}
                </div>
              )}

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
