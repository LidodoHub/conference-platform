import { useState } from 'react'
import { EyeIcon, EyeSlashIcon, ArrowLeftIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { frError } from '../../lib/errors'
import { HERO_PHOTO } from '../../lib/constants'
import Logo from '../../components/ui/Logo'
import ThemeToggle from '../../components/ui/ThemeToggle'

const MODES = {
  signin: { title: 'Se connecter', submit: 'Se connecter' },
  signup: { title: 'Créer un compte', submit: 'Créer mon compte' },
  reset: { title: 'Mot de passe oublié', submit: 'Envoyer le lien' },
}

function BadgePreview() {
  // Aperçu du vrai badge de conférence que reçoit un inscrit validé (même composition que dans l'app).
  return (
    <div className="card-ticket-static w-full max-w-sm rotate-[-2deg] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.5)]" aria-hidden="true">
      <div className="ticket-stripe" />
      <div className="ticket-perforation" />
      <div className="flex-1 p-5">
        <p className="text-xs text-muted">Badge d'accès</p>
        <p className="mt-1 font-semibold text-fg text-lg leading-snug">Journées IA et Sciences des données</p>
        <p className="mt-1 text-sm text-muted">12-14 novembre 2026, Université de Béjaïa</p>
        <div className="mt-5 pt-4 border-t border-dashed border-line flex items-end justify-between gap-4">
          <div>
            <p className="font-medium text-fg">Lina Haddad</p>
            <p className="text-xs text-muted">Inscription validée</p>
          </div>
          <div className="grid grid-cols-5 gap-[3px] p-1.5 rounded-md bg-fg/90">
            {[1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1].map((on, i) => (
              <span key={i} className={`w-2 h-2 rounded-[1px] ${on ? 'bg-surface' : 'bg-transparent'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthForm() {
  const [mode, setMode] = useState('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)

  const switchMode = (next) => {
    setMode(next)
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (mode === 'signin') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInError) setError(frError(signInError))
      // en cas de succès, App bascule automatiquement sur l'application
    } else if (mode === 'reset') {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      })
      if (resetError) setError(frError(resetError))
      else setSuccess("Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.")
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password })
      if (signUpError) {
        setError(frError(signUpError))
      } else if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ id: data.user.id, full_name: fullName.trim(), email: email.trim() })
        if (profileError) setError(frError(profileError))
        else if (!data.session)
          setSuccess('Compte créé. Ouvre le lien reçu par email pour confirmer ton adresse, puis connecte-toi.')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh bg-bg grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Panneau de marque (ordinateur) */}
      <aside className="hero hidden lg:flex relative overflow-hidden text-white flex-col justify-between p-12 xl:p-16">
        <img className="hero-photo hero-photo--tall" src={HERO_PHOTO} alt="" aria-hidden="true" decoding="async" />
        <div className="hero-shade hero-shade--panel" aria-hidden="true" />
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-dots" aria-hidden="true" />
        <div className="relative">
          <Logo inverted />
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.08]">
            Du dépôt des articles au badge d'entrée.
          </h1>
          <p className="mt-5 text-white/70 text-lg leading-relaxed max-w-[38ch]">
            Soumissions, reviews, programme, inscriptions et présences de vos conférences scientifiques, au même endroit.
          </p>
        </div>

        <div className="relative">
          <BadgePreview />
        </div>
      </aside>

      {/* Formulaire */}
      <main className="relative flex items-center justify-center px-4 py-10 sm:px-10">
        <ThemeToggle className="icon-btn absolute top-3 right-3 sm:top-5 sm:right-5" />
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden mb-10">
            <Logo inverted={false} />
          </div>

          {mode === 'reset' && (
            <button type="button" onClick={() => switchMode('signin')} className="btn-ghost -ml-3 mb-4">
              <ArrowLeftIcon size={16} aria-hidden="true" />
              Retour à la connexion
            </button>
          )}

          <h2 className="text-3xl font-semibold tracking-tight text-fg">{MODES[mode].title}</h2>
          <p className="text-muted mt-2">
            {mode === 'signin' && 'Accède à tes événements, articles et inscriptions.'}
            {mode === 'signup' && 'Un seul compte suffit pour soumettre, relire ou organiser.'}
            {mode === 'reset' && 'Indique ton adresse : tu recevras un lien pour choisir un nouveau mot de passe.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate={false}>
            {mode === 'signup' && (
              <div>
                <label htmlFor="fullName" className="form-label">
                  Nom complet
                </label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                  required
                />
                <p className="form-hint">Il apparaîtra sur ton badge et ton certificat.</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="form-label">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="password" className="form-label">
                    Mot de passe
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-[13px] text-accent-ink hover:underline underline-offset-4"
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    minLength={mode === 'signup' ? 6 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn w-9 h-9"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
                {mode === 'signup' && <p className="form-hint">Au moins 6 caractères.</p>}
              </div>
            )}

            {error && (
              <div role="alert" className="alert-error">
                {error}
              </div>
            )}
            {success && (
              <div role="status" className="alert-success">
                {success}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full min-h-11">
              {loading ? 'Un instant…' : MODES[mode].submit}
            </button>
          </form>

          {mode !== 'reset' && (
            <p className="mt-8 text-sm text-muted text-center">
              {mode === 'signin' ? "Pas encore de compte ? " : 'Déjà un compte ? '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                className="font-medium text-fg underline underline-offset-4 decoration-accent decoration-2 hover:text-accent-ink"
              >
                {mode === 'signin' ? 'Créer un compte' : 'Se connecter'}
              </button>
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
