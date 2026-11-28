import { useState, useEffect, useCallback } from 'react'
import { PlusIcon, XIcon, ArrowUpRightIcon, EyeIcon, EyeSlashIcon, TrashIcon, HandshakeIcon, PencilSimpleIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { frError, writeError } from '../../lib/errors'
import { useConfirm } from '../../context/ConfirmContext'
import { useLanguage } from '../../context/LanguageContext'
import EmptyState from '../../components/ui/EmptyState'
import SectionTitle from '../../components/ui/SectionTitle'

const TIERS = {
  platinum: { order: 0 },
  gold: { order: 1 },
  silver: { order: 2 },
  partner: { order: 3 },
}
const EMPTY_FORM = { name: '', tier: 'partner', website: '', benefits: '' }

// on n'accepte que http(s) : "javascript:..." deviendrait "https://javascript:..." donc inoffensif
const normalizeUrl = (value) => {
  const v = value.trim()
  if (!v) return null
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}
// protection à l'affichage aussi : une URL écrite directement en base sans passer par ce formulaire
const safeUrl = (url) => (/^https?:\/\//i.test(url || '') ? url : null)

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export default function SponsorsPanel({ eventId, isOrganizer, compact = false }) {
  const confirm = useConfirm()
  const { t } = useLanguage()
  const [sponsors, setSponsors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)

  const loadSponsors = useCallback(async () => {
    let query = supabase.from('sponsors').select('id, name, tier, website, benefits, published').eq('event_id', eventId)
    // côté public, on ne demande que les sponsors publiés (la RLS reste la vraie barrière)
    if (!isOrganizer) query = query.eq('published', true)
    const { data, error: loadError } = await query.order('name', { ascending: true })
    if (loadError) setError(frError(loadError))
    else setSponsors([...data].sort((a, b) => (TIERS[a.tier]?.order ?? 9) - (TIERS[b.tier]?.order ?? 9)))
    setLoading(false)
  }, [eventId, isOrganizer])

  useEffect(() => {
    loadSponsors()
  }, [loadSponsors])

  const updateField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const values = {
      name: form.name.trim(),
      tier: form.tier,
      website: normalizeUrl(form.website),
      benefits: form.benefits.trim() || null,
    }
    const res = editingId
      ? await supabase.from('sponsors').update(values).eq('id', editingId).select('id')
      : await supabase.from('sponsors').insert({ ...values, event_id: eventId, published: false }).select('id')
    setSaving(false)
    const msg = writeError(res, t('errors.saveRefused'))
    if (msg) {
      setError(msg)
      return
    }
    setForm(EMPTY_FORM)
    setShowForm(false)
    setEditingId(null)
    loadSponsors()
  }

  const togglePublished = async (sponsor) => {
    setError(null)
    const res = await supabase.from('sponsors').update({ published: !sponsor.published }).eq('id', sponsor.id).select('id')
    const msg = writeError(res, t('errors.saveRefused'))
    if (msg) setError(msg)
    else loadSponsors()
  }

  const handleDelete = async (sponsor) => {
    const ok = await confirm({
      title: t('sponsors.deleteTitle', { name: sponsor.name }),
      description: t('sponsors.deleteDesc'),
      confirmLabel: t('common.delete'),
      variant: 'danger',
    })
    if (!ok) return
    setError(null)
    const res = await supabase.from('sponsors').delete().eq('id', sponsor.id).select('id')
    const msg = writeError(res, t('errors.deleteRefused'))
    if (msg) setError(msg)
    else loadSponsors()
  }

  // Aperçu public : rien à afficher s'il n'y a pas de sponsor publié
  if (compact && !loading && sponsors.length === 0) return null

  return (
    <section>
      <SectionTitle
        title={compact ? t('sponsors.partnersTitle') : t('event.sponsors')}
        count={compact ? null : sponsors.length}
        description={compact ? null : t('sponsors.description')}
        actions={
          isOrganizer &&
          (showForm ? (
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                setForm(EMPTY_FORM)
              }}
              className="btn-ghost"
            >
              <XIcon size={16} aria-hidden="true" />
              {t('common.cancel')}
            </button>
          ) : (
            <button type="button" onClick={() => setShowForm(true)} className="btn-accent">
              <PlusIcon size={16} weight="bold" aria-hidden="true" />
              {t('sponsors.addSponsorBtn')}
            </button>
          ))
        }
      />

      {error && (
        <div role="alert" className="alert-error mb-5">
          {error}
        </div>
      )}

      {isOrganizer && showForm && (
        <form onSubmit={handleSubmit} className="card-panel space-y-5 mb-8 rise">
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_200px] gap-5">
            <div>
              <label htmlFor="sponsor-name" className="form-label">
                {t('sponsors.nameLabel')}
              </label>
              <input id="sponsor-name" className="input-field" value={form.name} onChange={updateField('name')} required />
            </div>
            <div>
              <label htmlFor="sponsor-tier" className="form-label">
                {t('sponsors.tierLabel')}
              </label>
              <select id="sponsor-tier" className="select-field" value={form.tier} onChange={updateField('tier')}>
                {Object.keys(TIERS).map((value) => (
                  <option key={value} value={value}>
                    {t(`sponsors.tiers.${value}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="sponsor-website" className="form-label">
              {t('sponsors.websiteLabel')}
            </label>
            <input id="sponsor-website" className="input-field" inputMode="url" value={form.website} onChange={updateField('website')} />
            <p className="form-hint">{t('sponsors.websiteHint')}</p>
          </div>
          <div>
            <label htmlFor="sponsor-benefits" className="form-label">
              {t('sponsors.benefitsLabel')}
            </label>
            <textarea id="sponsor-benefits" className="textarea-field" rows={3} value={form.benefits} onChange={updateField('benefits')} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? t('common.saving') : editingId ? t('common.save') : t('sponsors.addSponsorSubmit')}
          </button>
        </form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="skeleton h-32" />
          <div className="skeleton h-32" />
        </div>
      ) : sponsors.length === 0 ? (
        <EmptyState
          icon={HandshakeIcon}
          title={t('sponsors.emptyTitle')}
          body={t('sponsors.emptyBody')}
        />
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sponsors.map((s) => {
            const tierKey = TIERS[s.tier] ? s.tier : 'partner'
            const url = safeUrl(s.website)
            return (
              <li
                key={s.id}
                className="entity flex flex-col"
                style={{ '--stripe': s.tier === 'platinum' || s.tier === 'gold' ? 'var(--color-accent)' : 'var(--color-line)' }}
              >
                <div className="flex items-start gap-3.5">
                  <span className="inline-flex w-11 h-11 items-center justify-center rounded-xl bg-surface-2 border border-line text-lg font-semibold text-fg shrink-0">
                    {(s.name || '?').trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-fg leading-snug">{s.name}</h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="badge-type">{t(`sponsors.tiers.${tierKey}`)}</span>
                      {isOrganizer && (
                        <span className={s.published ? 'badge-published' : 'badge-draft'}>
                          {s.published ? t('eventCard.statuses.published') : t('eventCard.statuses.draft')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {s.benefits && <p className="mt-3 text-sm leading-6 text-muted whitespace-pre-line">{s.benefits}</p>}

                {(url || isOrganizer) && (
                  <div className="mt-auto pt-4 flex flex-wrap items-center gap-1.5">
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm -ms-2">
                        {hostOf(url)}
                        <ArrowUpRightIcon size={14} aria-hidden="true" />
                      </a>
                    )}
                    {isOrganizer && (
                      <span className="ms-auto flex gap-1">
                        <button
                          type="button"
                          className="icon-btn w-9 h-9"
                          onClick={() => {
                            setEditingId(s.id)
                            setForm({ name: s.name, tier: s.tier || 'partner', website: s.website || '', benefits: s.benefits || '' })
                            setShowForm(true)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          aria-label={`${t('common.edit')} ${s.name}`}
                          title={t('common.edit')}
                        >
                          <PencilSimpleIcon size={16} />
                        </button>
                        <button type="button" className="btn-outline btn-sm" onClick={() => togglePublished(s)}>
                          {s.published ? <EyeSlashIcon size={15} aria-hidden="true" /> : <EyeIcon size={15} aria-hidden="true" />}
                          {s.published ? t('sponsors.unpublish') : t('sponsors.publish')}
                        </button>
                        <button
                          type="button"
                          className="icon-btn w-9 h-9 hover:text-bad"
                          onClick={() => handleDelete(s)}
                          aria-label={`${t('common.delete')} ${s.name}`}
                          title={t('common.delete')}
                        >
                          <TrashIcon size={16} />
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
