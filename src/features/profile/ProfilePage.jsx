import { useState, useEffect } from 'react'
import { CheckIcon, SparkleIcon, SignOutIcon, QrCodeIcon, IdentificationBadgeIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { writeError, frError } from '../../lib/errors'
import PageHeader from '../../components/ui/PageHeader'
import Avatar from '../../components/ui/Avatar'
import Logo from '../../components/ui/Logo'
import { useLanguage } from '../../context/LanguageContext'

const SUGGESTED_TOPICS = [
  'Intelligence Artificielle',
  'Vision par Ordinateur',
  'NLP & Traitement du Langage',
  'Informatique Quantique',
  'Cybersécurité & Réseaux',
  'Systèmes Distribués',
  'Data Science & Bio-informatique',
]

// Profil de l'utilisateur avec aperçu en temps réel du badge de conférence.
export default function ProfilePage({ onSaved }) {
  const { user, isAdmin } = useAuth()
  const { t } = useLanguage()
  const [form, setForm] = useState(null)
  const [error, setError] = useState(null)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('full_name, email, affiliation, country, expertise, role')
      .eq('id', user.id)
      .single()
      .then(({ data, error: loadError }) => {
        if (loadError) setError(frError(loadError))
        else
          setForm({
            full_name: data.full_name || '',
            email: data.email || '',
            affiliation: data.affiliation || '',
            country: data.country || '',
            expertise: data.expertise || '',
          })
      })
  }, [user.id])

  const field = (name) => ({
    value: form?.[name] ?? '',
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
  })

  const addTopic = (topic) => {
    setForm((f) => {
      const current = f.expertise ? f.expertise.trim() : ''
      if (current.includes(topic)) return f
      const updated = current ? `${current}, ${topic}` : topic
      return { ...f, expertise: updated }
    })
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSavedSuccess(false)
    const res = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name.trim(),
        affiliation: form.affiliation.trim() || null,
        country: form.country.trim() || null,
        expertise: form.expertise.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id')
    setBusy(false)
    const msg = writeError(res, t('errors.saveRefused'))
    if (msg) setError(msg)
    else {
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
      onSaved?.()
    }
  }

  return (
    <div className="page-container max-w-6xl space-y-8">
      <PageHeader
        title={t('profile.title')}
        description={t('profile.description')}
      />

      {!form ? (
        error ? <div className="alert-error">{error}</div> : <div className="skeleton h-96" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_360px] gap-8 items-start">
          {/* Formulaire de gauche */}
          <form onSubmit={save} className="card overflow-hidden shadow-card">
            <div className="flex items-center gap-4 p-5 sm:p-7 border-b border-line bg-surface-2/40">
              <Avatar name={form.full_name} size={52} tone="brand" />
              <div className="min-w-0">
                <p className="text-lg font-semibold text-fg truncate">{form.full_name || t('profile.unnamed')}</p>
                <p className="text-xs text-muted truncate">
                  {form.email}
                  {isAdmin && <span className="text-accent-ink font-semibold"> · {t('roles.admin')}</span>}
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-7 space-y-5">
              <div>
                <label htmlFor="pf-name" className="form-label">
                  {t('profile.fullName')}
                </label>
                <input id="pf-name" className="input-field" autoComplete="name" required {...field('full_name')} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
                <div>
                  <label htmlFor="pf-aff" className="form-label">
                    {t('profile.affiliation')}
                  </label>
                  <input
                    id="pf-aff"
                    className="input-field"
                    placeholder={t('profile.affiliationPlaceholder')}
                    autoComplete="organization"
                    {...field('affiliation')}
                  />
                  <p className="form-hint">{t('profile.affiliationHint')}</p>
                </div>
                <div>
                  <label htmlFor="pf-country" className="form-label">
                    {t('profile.country')}
                  </label>
                  <input
                    id="pf-country"
                    className="input-field"
                    placeholder={t('profile.countryPlaceholder')}
                    autoComplete="country-name"
                    {...field('country')}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label htmlFor="pf-exp" className="form-label flex items-center gap-1.5 mb-0">
                    <span>{t('profile.expertise')}</span>
                    <SparkleIcon size={14} className="text-accent-ink" aria-hidden="true" />
                  </label>
                  <span className="text-xs text-muted">{t('profile.aiMatchingHint')}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {SUGGESTED_TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => addTopic(topic)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-line bg-surface hover:border-accent/50 hover:bg-accent/10 hover:text-accent-ink transition-colors text-muted"
                    >
                      + {topic}
                    </button>
                  ))}
                </div>

                <textarea
                  id="pf-exp"
                  className="textarea-field"
                  rows={3}
                  placeholder={t('profile.expertisePlaceholder')}
                  {...field('expertise')}
                />
                <p className="form-hint">
                  {t('profile.expertiseHelp')}
                </p>
              </div>

              {error && (
                <div role="alert" className="alert-error">
                  {error}
                </div>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={busy}
                  className={`btn-primary ${savedSuccess ? 'bg-ok text-white' : ''}`}
                >
                  <CheckIcon size={16} weight="bold" aria-hidden="true" />
                  {busy ? t('common.saving') : savedSuccess ? t('common.saved') : t('profile.saveProfile')}
                </button>
              </div>
            </div>
          </form>

          {/* Colonne de droite : Aperçu en direct du Badge de Conférence */}
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-accent-ink inline-flex items-center gap-1.5">
                <IdentificationBadgeIcon size={16} weight="duotone" />
                {t('profile.liveBadge')}
              </span>
              <span className="text-[11px] font-mono text-muted">{t('profile.badgePreview')}</span>
            </div>

            {/* Carte Badge Conférence physique */}
            <div className="relative rounded-2xl border-2 border-line/80 bg-surface shadow-lift overflow-hidden text-center flex flex-col items-center">
              {/* Encoche pour le cordon de cou */}
              <div className="w-14 h-3 rounded-full bg-navy/80 dark:bg-black/60 mt-3 mx-auto shadow-inner" />

              {/* En-tête Badge */}
              <div className="w-full bg-navy text-white px-5 py-4 mt-3 border-y border-accent/40 flex items-center justify-between">
                <Logo compact inverted />
                <div className="text-end">
                  <span className="block text-[10px] font-mono text-accent uppercase tracking-wider font-semibold">
                    Conférence 2026
                  </span>
                  <span className="block text-[9px] text-white/60">USTO-MB Oran</span>
                </div>
              </div>

              {/* Corps du badge */}
              <div className="p-6 w-full space-y-4">
                <div className="flex justify-center">
                  <div className="p-1 rounded-full border-2 border-accent/60 shadow-sm flex items-center justify-center">
                    <Avatar name={form.full_name || 'Chercheur'} size={72} tone="brand" round />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-fg text-lg leading-snug truncate" title={form.full_name}>
                    {form.full_name || t('profile.unnamed')}
                  </h3>
                  <p className="text-xs font-medium text-accent-ink truncate" title={form.affiliation}>
                    {form.affiliation || t('profile.affiliationPlaceholder')}
                  </p>
                  <p className="text-[11px] text-muted">
                    {form.country || t('profile.countryPlaceholder')}
                  </p>
                </div>

                <div className="pt-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-accent text-on-accent text-xs font-bold uppercase tracking-wider shadow-xs">
                    {isAdmin ? t('workspace.scientificCommittee') : `${t('roles.author')} & ${t('roles.participant')}`}
                  </span>
                </div>

                {/* Simulation QR Code d'accès */}
                <div className="pt-3 border-t border-line/60 flex items-center justify-center gap-3">
                  <div className="p-2 rounded-xl bg-white text-navy shadow-xs border border-line/40">
                    <QrCodeIcon size={44} weight="bold" />
                  </div>
                  <div className="text-start text-[10px] font-mono text-muted leading-tight">
                    <span className="block text-fg font-semibold">ID D'ACCÈS VÉRIFIÉ</span>
                    <span className="block text-faint mt-0.5">CNF-2026-{(user.id || '0000').slice(0, 8).toUpperCase()}</span>
                    <span className="block text-ok mt-0.5 font-sans font-medium">Prêt pour impression</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      <div className="card p-5 sm:p-7 flex flex-wrap items-center justify-between gap-3 shadow-card">
        <div>
          <p className="font-semibold text-fg text-sm">Gestion de la session</p>
          <p className="text-xs text-muted">{form?.email || user.email}</p>
        </div>
        <button type="button" className="btn-danger btn-sm" onClick={() => supabase.auth.signOut()}>
          <SignOutIcon size={16} aria-hidden="true" />
          {t('nav.signOut')}
        </button>
      </div>
    </div>
  )
}
