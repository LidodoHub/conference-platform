import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { frError } from '../../lib/errors'
import Logo from '../../components/ui/Logo'

// Affiché quand l'utilisateur arrive depuis le lien "mot de passe oublié".
export default function NewPasswordForm({ onDone }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) setError(frError(updateError))
    else onDone()
  }

  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-[400px] space-y-5">
        <Logo inverted={false} />
        <h1 className="text-3xl font-semibold tracking-tight text-fg pt-6">Nouveau mot de passe</h1>
        <div>
          <label htmlFor="new-password" className="form-label">
            Mot de passe
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            required
          />
          <p className="form-hint">Au moins 6 caractères.</p>
        </div>
        {error && (
          <div role="alert" className="alert-error">
            {error}
          </div>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full min-h-11">
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}
