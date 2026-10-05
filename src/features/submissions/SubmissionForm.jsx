import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { frError } from '../../lib/errors'

const words = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0)

export default function SubmissionForm({ eventId, onSubmitted }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [abstract, setAbstract] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error: insertError } = await supabase.from('submissions').insert({
      event_id: eventId,
      author_id: user.id,
      title: title.trim(),
      abstract: abstract.trim(),
      status: 'submitted',
    })
    setSubmitting(false)
    if (insertError) {
      setError(frError(insertError))
      return
    }
    setTitle('')
    setAbstract('')
    onSubmitted()
  }

  const n = words(abstract)

  return (
    <form onSubmit={handleSubmit} className="card-panel space-y-5 rise">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-fg">Nouvel article</h3>
        <p className="text-sm text-muted mt-1">Les reviewers de l'événement liront le titre et le résumé.</p>
      </div>

      <div>
        <label htmlFor="submission-title" className="form-label">
          Titre
        </label>
        <input
          id="submission-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-field"
          required
        />
      </div>

      <div>
        <label htmlFor="submission-abstract" className="form-label">
          Résumé
        </label>
        <textarea
          id="submission-abstract"
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
          className="textarea-field"
          rows={8}
          required
        />
        <p className="form-hint num">
          {n} mot{n > 1 ? 's' : ''}. Entre 150 et 500 mots recommandés.
        </p>
      </div>

      {error && (
        <div role="alert" className="alert-error">
          {error}
        </div>
      )}

      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? 'Envoi…' : "Soumettre l'article"}
      </button>
    </form>
  )
}
