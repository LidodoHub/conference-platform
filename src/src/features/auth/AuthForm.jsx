import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(true)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)

  const switchMode = () => {
    setIsSignUp(!isSignUp)
    setError(null)
    setSuccess(null)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: fullName,
          email,
          role: 'participant',
        })

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    setSuccess('Compte créé avec succès.')
    setFullName('')
    setEmail('')
    setPassword('')
    setLoading(false)
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    setSuccess(`Connecté en tant que ${data.user.email}`)
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex">
      {/* Panneau branding — desktop */}
      <aside className="hidden lg:flex lg:w-[44%] xl:w-[48%] bg-ink relative overflow-hidden flex-col justify-between p-12 xl:p-16">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-lg bg-gold flex items-center justify-center">
              <span className="font-display font-bold text-ink text-lg">C</span>
            </div>
            <span className="font-display font-semibold text-2xl text-white tracking-tight">
              ConfPlatform
            </span>
          </div>

          <h1 className="font-display font-semibold text-4xl xl:text-5xl text-white leading-[1.15] tracking-tight text-balance max-w-md">
            Votre badge d'accès aux événements scientifiques
          </h1>
          <p className="text-white/55 mt-6 text-base leading-relaxed max-w-sm">
            Conférences, colloques, séminaires et workshops — inscrivez-vous, soumettez vos articles et gérez vos participations.
          </p>
        </div>

        {/* Ticket décoratif */}
        <div className="relative mt-12">
          <div className="card-ticket max-w-xs pointer-events-none select-none opacity-90">
            <div className="ticket-stripe" />
            <div className="ticket-perforation" />
            <div className="p-5 flex-1 bg-cream/95">
              <p className="section-label">Accès participant</p>
              <p className="font-display font-semibold text-ink mt-2 text-lg">Colloque IA &amp; Sciences</p>
              <p className="font-mono text-xs text-taupe mt-3">12–14 Nov 2026 · Alger</p>
              <div className="mt-4 pt-3 border-t border-dashed border-taupe/30">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-gold">Admis · Session A</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Formulaire */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-md bg-gold flex items-center justify-center">
              <span className="font-display font-bold text-ink text-sm">C</span>
            </div>
            <span className="font-display font-semibold text-xl text-ink">ConfPlatform</span>
          </div>

          <div className="mb-8">
            <p className="section-label mb-2">
              {isSignUp ? 'Inscription' : 'Connexion'}
            </p>
            <h2 className="section-heading text-3xl sm:text-4xl">
              {isSignUp ? 'Créer un compte' : 'Se connecter'}
            </h2>
            <p className="text-taupe text-sm mt-2 leading-relaxed">
              {isSignUp
                ? 'Rejoignez la plateforme pour participer aux événements scientifiques.'
                : 'Accédez à vos événements, soumissions et certificats.'}
            </p>
          </div>

          <div className="card-panel">
            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-5">
              {isSignUp && (
                <div>
                  <label htmlFor="fullName" className="form-label">Nom complet</label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Pr. Amine Benali"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="form-label">Adresse email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="amine@univ.dz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="form-label">Mot de passe</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              {error && <div className="alert-error">{error}</div>}
              {success && <div className="alert-success">{success}</div>}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Traitement en cours…' : isSignUp ? "S'inscrire" : 'Se connecter'}
              </button>
            </form>

            <div className="divider-dotted mt-6 pt-6 text-center">
              <button
                onClick={switchMode}
                className="text-sm text-taupe hover:text-ink transition-colors duration-200"
              >
                {isSignUp ? (
                  <>Déjà un compte ? <span className="text-gold font-medium">Se connecter</span></>
                ) : (
                  <>Pas de compte ? <span className="text-gold font-medium">S'inscrire</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
