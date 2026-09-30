import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function ReviewForm({ submissionId, onReviewed }) {
  const [score, setScore] = useState(3)
  const [comments, setComments] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()

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
      })

    if (reviewError) {
      setError(reviewError.message)
      setSubmitting(false)
      return
    }

    setComments('')
    setScore(3)
    setRecommendation('')
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
          onChange={(e) => setRecommendation(e.target.value)}
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