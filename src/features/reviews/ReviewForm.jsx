import { useState, useEffect } from 'react'
import { StarIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { frError } from '../../lib/errors'

const RECOMMENDATIONS = [
  { value: 'accept', label: 'Accepter', hint: "L'article est prêt.", color: 'var(--color-ok)' },
  { value: 'revise', label: 'Réviser', hint: 'Bon fond, corrections nécessaires.', color: 'var(--color-warn)' },
  { value: 'reject', label: 'Rejeter', hint: 'Hors sujet ou insuffisant.', color: 'var(--color-bad)' },
]

const SCORE_LABELS = { 1: 'Très faible', 2: 'Faible', 3: 'Correct', 4: 'Bon', 5: 'Excellent' }

export default function ReviewForm({ submissionId, eventId, onReviewed }) {
  const { user } = useAuth()
  const [score, setScore] = useState(3)
  const [comments, setComments] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [sessions, setSessions] = useState([])
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!eventId) return
    supabase
      .from('sessions')
      .select('id, title')
      .eq('event_id', eventId)
      .order('title', { ascending: true })
      .then(({ data }) => setSessions(data || []))
  }, [eventId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!recommendation) {
      setError('Choisis une recommandation.')
      return
    }
    setSubmitting(true)
    setError(null)
    const { error: reviewError } = await supabase.from('reviews').insert({
      submission_id: submissionId,
      reviewer_id: user.id,
      score,
      comments: comments.trim(),
      recommendation,
      recommended_session_id: recommendation === 'accept' && sessionId ? sessionId : null,
    })
    setSubmitting(false)
    if (reviewError) {
      setError(frError(reviewError))
      return
    }
    onReviewed()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 pt-5 border-t border-line space-y-6">
      <fieldset>
        <legend className="form-label">Note globale</legend>
        <div className="flex items-center gap-3">
          <div className="flex gap-1" role="radiogroup" aria-label="Note sur 5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={score === n}
                aria-label={`${n} sur 5, ${SCORE_LABELS[n]}`}
                onClick={() => setScore(n)}
                className="p-1 rounded-md transition-transform hover:scale-110"
              >
                <StarIcon size={26} weight={n <= score ? 'fill' : 'regular'} className={n <= score ? 'text-accent' : 'text-faint'} />
              </button>
            ))}
          </div>
          <span className="text-sm text-muted">{SCORE_LABELS[score]}</span>
        </div>
      </fieldset>

      <fieldset>
        <legend className="form-label">Recommandation</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {RECOMMENDATIONS.map((r) => {
            const active = recommendation === r.value
            return (
              <label
                key={r.value}
                className={`cursor-pointer rounded-xl border px-3.5 py-3 transition-colors ${
                  active ? 'border-transparent' : 'border-line hover:border-fg/25'
                }`}
                style={active ? { background: `color-mix(in srgb, ${r.color} 12%, transparent)`, boxShadow: `inset 0 0 0 1.5px ${r.color}` } : undefined}
              >
                <input
                  type="radio"
                  name={`rec-${submissionId}`}
                  value={r.value}
                  checked={active}
                  onChange={() => {
                    setRecommendation(r.value)
                    if (r.value !== 'accept') setSessionId('')
                  }}
                  className="sr-only"
                />
                <span className="block text-sm font-medium" style={{ color: active ? r.color : undefined }}>
                  {r.label}
                </span>
                <span className="block text-xs text-muted mt-0.5">{r.hint}</span>
              </label>
            )
          })}
        </div>
        <p className="form-hint">L'organisateur prend la décision finale.</p>
      </fieldset>

      {recommendation === 'accept' && sessions.length > 0 && (
        <div>
          <label htmlFor={`session-${submissionId}`} className="form-label">
            Session suggérée (facultatif)
          </label>
          <select id={`session-${submissionId}`} value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="select-field sm:max-w-sm">
            <option value="">Pas de préférence</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <p className="form-hint">Simple suggestion : l'organisateur place définitivement les articles.</p>
        </div>
      )}

      <div>
        <label htmlFor={`comments-${submissionId}`} className="form-label">
          Commentaire pour l'auteur
        </label>
        <textarea
          id={`comments-${submissionId}`}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="textarea-field"
          rows={4}
        />
        <p className="form-hint">Transmis anonymement. Points forts, faiblesses, corrections attendues.</p>
      </div>

      {error && (
        <div role="alert" className="alert-error">
          {error}
        </div>
      )}

      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? 'Envoi…' : 'Envoyer la review'}
      </button>
    </form>
  )
}
