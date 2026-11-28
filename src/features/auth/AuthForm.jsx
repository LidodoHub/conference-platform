import { useState } from 'react'
import {
  EyeIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
  SparkleIcon,
  ArticleIcon,
  UserIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  InfoIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { frError } from '../../lib/errors'
import { AUTH_PHOTO } from '../../lib/constants'
import Logo from '../../components/ui/Logo'
import ThemeToggle from '../../components/ui/ThemeToggle'
import { useLanguage } from '../../context/LanguageContext'

const DEMO_ACCOUNTS = [
  {
    roleKey: 'organizer',
    name: 'Pr. Amine Khelil',
    email: 'demo-organisateur@usto-mb.dz',
    password: 'ConferaDemo2026!',
    icon: SparkleIcon,
    badgeClass: 'bg-accent/15 text-accent-ink',
    desc: 'Pilotage colloques, comités scientifiques, programmation & validation des inscriptions.',
  },
  {
    roleKey: 'reviewer',
    name: 'Dr. Samia Benali',
    email: 'demo-reviewer@usto-mb.dz',
    password: 'ConferaDemo2026!',
    icon: ArticleIcon,
    badgeClass: 'bg-info/15 text-info-ink',
    desc: 'Évaluation scientifique des articles assignés, notation multicritères et recommandations.',
  },
  {
    roleKey: 'participant',
    name: 'Yacine Meziane',
    email: 'demo-chercheur@usto-mb.dz',
    password: 'ConferaDemo2026!',
    icon: UserIcon,
    badgeClass: 'bg-ok/15 text-ok',
    desc: 'Dépôt d’articles, suivi de décision, badge d’accès QR code officiel et attestations.',
  },
  {
    roleKey: 'admin',
    name: 'Dr. Karim Benmansour',
    email: 'demo-admin@confera.dz',
    password: 'ConferaDemo2026!',
    icon: ShieldCheckIcon,
    badgeClass: 'bg-warn/15 text-warn',
    desc: 'Supervision globale de l’établissement, statistiques campus et modération des événements.',
  },
]

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
  const { t } = useLanguage()
  const [mode, setMode] = useState('signin')

  const modes = {
    signin: { title: t('auth.signinTitle'), submit: t('auth.signinSubmit') },
    signup: { title: t('auth.signupTitle'), submit: t('auth.signupSubmit') },
    reset: { title: t('auth.resetTitle'), submit: t('auth.resetSubmit') },
  }
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)
  const [quickLoadingKey, setQuickLoadingKey] = useState(null)

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
      else setSuccess(t('auth.resetSent'))
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
          setSuccess(t('auth.accountCreated'))
      }
    }
    setLoading(false)
  }

  const handleQuickLogin = async (acc) => {
    setQuickLoadingKey(acc.roleKey)
    setEmail(acc.email)
    setPassword(acc.password)
    setError(null)
    setSuccess(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.password,
    })
    if (signInError) {
      setError(frError(signInError))
      setQuickLoadingKey(null)
    }
  }

  return (
    <div className="min-h-dvh bg-bg grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Panneau de marque (ordinateur) */}
      <aside className="hero hidden lg:flex relative overflow-hidden text-white flex-col justify-between p-12 xl:p-16">
        <img className="hero-photo hero-photo--tall" src={AUTH_PHOTO.src} alt="" aria-hidden="true" decoding="async" />
        <div className="hero-shade hero-shade--panel" aria-hidden="true" />
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-dots" aria-hidden="true" />
        <div className="relative">
          <Logo inverted />
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.08]">
            {t('auth.heroTitle')}
          </h1>
          <p className="mt-5 text-white/70 text-lg leading-relaxed max-w-[38ch]">
            {t('auth.heroSubtitle')}
          </p>
        </div>

        <div className="relative">
          <BadgePreview />
          <a
            href={AUTH_PHOTO.page}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-6 text-[10px] text-white/45 hover:text-white/80 transition-colors"
          >
            {AUTH_PHOTO.credit}
          </a>
        </div>
      </aside>

      {/* Formulaire */}
      <main className="relative flex items-center justify-center px-4 py-8 sm:px-10">
        <div className="absolute top-3 end-3 sm:top-5 sm:end-5 z-10">
          <ThemeToggle className="icon-btn" />
        </div>
        <div className="w-full max-w-[440px]">
          <div className="lg:hidden mb-8">
            <Logo inverted={false} />
          </div>

          {mode === 'reset' && (
            <button type="button" onClick={() => switchMode('signin')} className="btn-ghost -ms-3 mb-4">
              <ArrowLeftIcon size={16} className="rtl:rotate-180" aria-hidden="true" />
              {t('auth.backToSignIn')}
            </button>
          )}

          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-fg">{modes[mode].title}</h2>
          <p className="text-muted text-sm mt-1.5">
            {mode === 'signin' && t('auth.signinDesc')}
            {mode === 'signup' && t('auth.signupDesc')}
            {mode === 'reset' && t('auth.resetDesc')}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate={false}>
            {mode === 'signup' && (
              <div>
                <label htmlFor="fullName" className="form-label">
                  {t('auth.fullName')}
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
                <p className="form-hint">{t('auth.fullNameHint')}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="form-label">
                {t('auth.email')}
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
                    {t('auth.password')}
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-[13px] text-accent-ink hover:underline underline-offset-4"
                    >
                      {t('auth.forgotPassword')}
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
                    className="input-field pe-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute end-1 top-1/2 -translate-y-1/2 icon-btn w-9 h-9"
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    {showPassword ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
                {mode === 'signup' && <p className="form-hint">{t('auth.minPasswordHint')}</p>}
              </div>
            )}

            {error && (
              <div role="alert" className="alert-error text-xs">
                {error}
              </div>
            )}
            {success && (
              <div role="status" className="alert-success text-xs">
                {success}
              </div>
            )}

            <button type="submit" disabled={loading || Boolean(quickLoadingKey)} className="btn-primary w-full min-h-10">
              {loading ? t('auth.wait') : modes[mode].submit}
            </button>
          </form>

          {mode !== 'reset' && (
            <p className="mt-5 text-xs text-muted text-center">
              {mode === 'signin' ? `${t('auth.noAccount')} ` : `${t('auth.hasAccount')} `}
              <button
                type="button"
                onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                className="font-medium text-fg underline underline-offset-4 decoration-accent decoration-2 hover:text-accent-ink"
              >
                {mode === 'signin' ? t('auth.signupTitle') : t('auth.signinTitle')}
              </button>
            </p>
          )}

          {/* Section Comptes de Démonstration (1 clic) */}
          {mode === 'signin' && (
            <div className="mt-7 pt-5 border-t border-line/70">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {t('auth.demoHeading')}
                  </p>
                  <p className="text-xs text-muted/80 mt-0.5">
                    {t('auth.demoSubheading')}
                  </p>
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent-ink border border-accent/20">
                  {t('auth.prototype')}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {DEMO_ACCOUNTS.map((acc) => {
                  const Icon = acc.icon
                  const isCurrentLoading = quickLoadingKey === acc.roleKey
                  const roleLabel = t(`roles.${acc.roleKey}`)
                  return (
                    <div
                      key={acc.roleKey}
                      className="card p-2.5 sm:p-3 border-line/70 bg-surface/50 hover:bg-surface hover:border-line hover:shadow-xs transition-all flex items-center justify-between gap-3 text-start"
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-fg/5 text-fg flex items-center justify-center shrink-0">
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-fg truncate">{acc.name}</span>
                            <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${acc.badgeClass}`}>
                              {roleLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted truncate mt-0.5">{acc.desc}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={loading || Boolean(quickLoadingKey)}
                        onClick={() => handleQuickLogin(acc)}
                        className="btn-outline btn-sm shrink-0 text-xs inline-flex items-center gap-1 active:scale-95 py-1 px-2.5"
                        title={roleLabel}
                      >
                        {isCurrentLoading ? (
                          <span className="text-xs text-accent-ink font-semibold">{t('auth.connecting')}</span>
                        ) : (
                          <>
                            <span>{t('auth.testBtn')}</span>
                            <ArrowRightIcon size={12} className="rtl:rotate-180" />
                          </>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="mt-3 p-2.5 rounded-lg bg-fg/[0.03] border border-line/50 text-[11px] text-muted flex items-start gap-2">
                <InfoIcon size={14} className="shrink-0 mt-0.5 text-accent-ink" />
                <span className="leading-relaxed">
                  Mot de passe commun : <code className="font-mono text-fg font-semibold select-all">ConferaDemo2026!</code>.
                  Pour simuler des interactions simultanées, ouvrez une fenêtre de navigation privée.
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
