import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'

export default function ReviewForm({ submissionId, eventId, onReviewed }) {
  const [score, setScore] = useState(3)
  const [comments, setComments] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [sessions, setSessions] = useState([])
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { user } = useAuth()

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
    setSubmitting(true)
    setError(null)

    if (!user) {
      setError('Tu dois être connecté')
      setSubmitting(false)
      return
    }

    const { error: reviewError } = await supabase
      .from('reviews')
      .insert({
        submission_id: submissionId,
        reviewer_id: user.id,
        score,
        comments,
        recommendation,
        recommended_session_id: recommendation === 'accept' && sessionId ? sessionId : null,
      })

    if (reviewError) {
      setError(reviewError.message)
      setSubmitting(false)
      return
    }

    setComments('')
    setScore(3)
    setRecommendation('')
    setSessionId('')
    setSubmitting(false)
    onReviewed()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 pt-4 border-t border-dashed border-taupe/30 space-y-4"
    >
      <p className="section-label">Formulaire de review</p>

      <div>
        <label htmlFor={`score-${submissionId}`} className="form-label">
          Score (1–5)
        </label>
        <input
          id={`score-${submissionId}`}
          type="number"
          min="1"
          max="5"
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="input-field font-mono w-24"
          required
        />
      </div>

      <div>
        <label htmlFor={`comments-${submissionId}`} className="form-label">
          Commentaires
        </label>
        <textarea
          id={`comments-${submissionId}`}
          placeholder="Observations, points forts, suggestions d'amélioration…"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="textarea-field"
          rows={3}
        />
      </div>

      <div>
        <label htmlFor={`recommendation-${submissionId}`} className="form-label">
          Recommandation
        </label>
        <select
          id={`recommendation-${submissionId}`}
          value={recommendation}
          onChange={(e) => {
            setRecommendation(e.target.value)
            if (e.target.value !== 'accept') setSessionId('')
          }}
          className="select-field"
          required
        >
          <option value="" disabled>Choisir…</option>
          <option value="accept">Recommander l'acceptation</option>
          <option value="reject">Recommander le rejet</option>
          <option value="revise">Recommander une révision</option>
        </select>
        <p className="text-xs text-taupe mt-1">
          Ta recommandation est transmise à l'organisateur, qui prend la décision finale.
        </p>
      </div>

      {recommendation === 'accept' && (
        <div>
          <label htmlFor={`session-${submissionId}`} className="form-label">
            Session recommandée (optionnel)
          </label>
          {sessions.length === 0 ? (
            <p className="text-xs text-taupe">Aucune session n'a encore été créée pour cet événement.</p>
          ) : (
            <select
              id={`session-${submissionId}`}
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="select-field"
            >
              <option value="">Pas de préférence</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          )}
          <p className="text-xs text-taupe mt-1">
            Simple suggestion : l'organisateur affectera définitivement l'article en phase organisationnelle.
          </p>
        </div>
      )}

      {error && <div className="alert-error">{error}</div>}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full sm:w-auto"
      >
        {submitting ? 'Envoi…' : 'Soumettre la review'}
      </button>
    </form>
  )
}