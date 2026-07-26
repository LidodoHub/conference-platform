import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function SubmissionForm({ eventId, onSubmitted }) {
  const [title, setTitle] = useState('')
  const [abstract, setAbstract] = useState('')
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

    const { error: insertError } = await supabase
      .from('submissions')
      .insert({
        event_id: eventId,
        author_id: user.id,
        title,
        abstract,
        status: 'submitted',
      })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    setTitle('')
    setAbstract('')
    setSubmitting(false)
    onSubmitted()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 border rounded-lg">
      <h3 className="font-bold">Soumettre un article</h3>
      <input
        type="text"
        placeholder="Titre de l'article"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border p-2 rounded"
        required
      />
      <textarea
        placeholder="Résumé (abstract)"
        value={abstract}
        onChange={(e) => setAbstract(e.target.value)}
        className="w-full border p-2 rounded"
        rows={4}
        required
      />

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
      >
        {submitting ? 'Envoi...' : 'Soumettre'}
      </button>
    </form>
  )
}