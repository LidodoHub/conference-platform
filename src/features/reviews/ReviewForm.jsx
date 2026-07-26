import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function ReviewForm({ submissionId, onReviewed }) {
  const [score, setScore] = useState(3)
  const [comments, setComments] = useState('')
  const [decision, setDecision] = useState('accepted')
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

    // 1. Créer la review
    const { error: reviewError } = await supabase
      .from('reviews')
      .insert({
        submission_id: submissionId,
        reviewer_id: user.id,
        score,
        comments,
      })

    if (reviewError) {
      setError(reviewError.message)
      setSubmitting(false)
      return
    }

    // 2. Mettre à jour le statut de la soumission
    const { error: updateError } = await supabase
      .from('submissions')
      .update({ status: decision })
      .eq('id', submissionId)

    if (updateError) {
      setError(updateError.message)
      setSubmitting(false)
      return
    }

    setComments('')
    setScore(3)
    setSubmitting(false)
    onReviewed()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3 border-t mt-2">
      <div>
        <label className="text-xs text-gray-500">Score (1-5)</label>
        <input
          type="number"
          min="1"
          max="5"
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="w-full border p-2 rounded"
          required
        />
      </div>
      <textarea
        placeholder="Commentaires"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        className="w-full border p-2 rounded"
        rows={2}
      />
      <select
        value={decision}
        onChange={(e) => setDecision(e.target.value)}
        className="w-full border p-2 rounded"
      >
        <option value="accepted">Accepter</option>
        <option value="rejected">Rejeter</option>
        <option value="revision_requested">Demander une révision</option>
      </select>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50"
      >
        {submitting ? 'Envoi...' : 'Soumettre la review'}
      </button>
    </form>
  )
}