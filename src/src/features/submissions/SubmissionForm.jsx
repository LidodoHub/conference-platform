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
    <form onSubmit={handleSubmit} className="card-panel border border-ink/8 space-y-5">
      <div>
        <p className="section-label">Nouvelle soumission</p>
        <h3 className="section-heading text-lg mt-1">Soumettre un article</h3>
      </div>

      <div>
        <label htmlFor="submission-title" className="form-label">Titre de l'article</label>
        <input
          id="submission-title"
          type="text"
          placeholder="Titre complet de la communication"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-field"
          required
        />
      </div>

      <div>
        <label htmlFor="submission-abstract" className="form-label">Résumé (abstract)</label>
        <textarea
          id="submission-abstract"
          placeholder="Résumé de votre communication (300–500 mots recommandés)"
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
          className="textarea-field"
          rows={5}
          required
        />
      </div>

      {error && <div className="alert-error">{error}</div>}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full sm:w-auto"
      >
        {submitting ? 'Envoi…' : 'Soumettre'}
      </button>
    </form>
  )
}
