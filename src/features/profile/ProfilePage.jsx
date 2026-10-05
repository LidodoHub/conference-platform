import { useState, useEffect } from 'react'
import { CheckIcon, SparkleIcon, SignOutIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { writeError, frError } from '../../lib/errors'
import { ROLE_LABELS } from '../../lib/constants'
import PageHeader from '../../components/ui/PageHeader'
import Avatar from '../../components/ui/Avatar'

// Profil de l'utilisateur. L'expertise sert au matching reviewer-article (module IA).
export default function ProfilePage({ onSaved }) {
  const { user, isAdmin } = useAuth()
  const [form, setForm] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
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

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
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
    const msg = writeError(res, 'Enregistrement refusé : la migration 002 a-t-elle été appliquée ?')
    if (msg) setError(msg)
    else {
      setNotice('Profil enregistré.')
      onSaved?.()
    }
  }

  return (
    <div className="page-container max-w-3xl">
      <PageHeader title="Mon profil" description="Ces informations apparaissent sur ton badge, ton certificat et auprès des organisateurs." />

      {!form ? (
        error ? <div className="alert-error">{error}</div> : <div className="skeleton h-96" />
      ) : (
        <form onSubmit={save} className="card overflow-hidden">
          <div className="flex items-center gap-4 p-5 sm:p-7 border-b border-line bg-surface-2/50">
            <Avatar name={form.full_name} size={56} tone="brand" />
            <div className="min-w-0">
              <p className="text-lg font-semibold text-fg truncate">{form.full_name || 'Sans nom'}</p>
              <p className="text-sm text-muted truncate">
                {form.email}
                {isAdmin && <span className="text-accent-ink font-medium"> · {ROLE_LABELS.admin}</span>}
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-7 space-y-5">
            <div>
              <label htmlFor="pf-name" className="form-label">
                Nom complet
              </label>
              <input id="pf-name" className="input-field" autoComplete="name" required {...field('full_name')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
              <div>
                <label htmlFor="pf-aff" className="form-label">
                  Affiliation
                </label>
                <input id="pf-aff" className="input-field" autoComplete="organization" {...field('affiliation')} />
                <p className="form-hint">Université, laboratoire ou entreprise.</p>
              </div>
              <div>
                <label htmlFor="pf-country" className="form-label">
                  Pays
                </label>
                <input id="pf-country" className="input-field" autoComplete="country-name" {...field('country')} />
              </div>
            </div>
            <div>
              <label htmlFor="pf-exp" className="form-label flex items-center gap-1.5">
                Domaines d'expertise
                <SparkleIcon size={14} className="text-accent-ink" aria-hidden="true" />
              </label>
              <textarea id="pf-exp" className="textarea-field" rows={4} {...field('expertise')} />
              <p className="form-hint">
                Quelques lignes ou mots-clés (ex. vision par ordinateur, segmentation d'images, réseaux convolutifs). Elles serviront à
                proposer à chaque reviewer les articles les plus proches de ses compétences.
              </p>
            </div>

            {error && (
              <div role="alert" className="alert-error">
                {error}
              </div>
            )}
            {notice && (
              <div role="status" className="alert-success">
                {notice}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary">
              <CheckIcon size={16} weight="bold" aria-hidden="true" />
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 card p-5 sm:p-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-fg">Session</p>
          <p className="text-sm text-muted">Connecté avec {form?.email || user.email}.</p>
        </div>
        <button type="button" className="btn-danger" onClick={() => supabase.auth.signOut()}>
          <SignOutIcon size={16} aria-hidden="true" />
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
