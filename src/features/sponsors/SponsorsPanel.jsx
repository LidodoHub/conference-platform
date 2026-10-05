import { useState, useEffect, useCallback } from 'react'
import Pill from '../../components/ui/Pill'
import { supabase } from '../../lib/supabaseClient'
import EmptyState from '../../components/ui/EmptyState'

const TIERS = {
  platinum: { label: 'Platine', color: '#D5DEEC' },
  gold: { label: 'Or', color: '#E6BE5A' },
  silver: { label: 'Argent', color: '#C4C9D2' },
  partner: { label: 'Partenaire', color: '#8FD0BE' },
}
const TIER_ORDER = { platinum: 0, gold: 1, silver: 2, partner: 3 }
const EMPTY_FORM = { name: '', tier: 'partner', website: '', benefits: '' }

// on n'accepte que http(s) : "javascript:..." deviendrait "https://javascript:..." donc inoffensif
const normalizeUrl = (value) => {
  const v = value.trim()
  if (!v) return null
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export default function SponsorsPanel({ eventId, isOrganizer }) {
  const [sponsors, setSponsors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const loadSponsors = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('sponsors')
      .select('id, name, tier, website, benefits, published')
      .eq('event_id', eventId)
      .order('name', { ascending: true })

    if (loadError) {
      setError(loadError.message)
    } else {
      setSponsors(
        [...data].sort((a, b) => (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9)),
      )
    }
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    loadSponsors()
  }, [loadSponsors])

  const updateField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { error: insertError } = await supabase.from('sponsors').insert({
      event_id: eventId,
      name: form.name.trim(),
      tier: form.tier,
      website: normalizeUrl(form.website),
      benefits: form.benefits.trim() || null,
      published: false,
    })
    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }
    setForm(EMPTY_FORM)
    setShowForm(false)
    loadSponsors()
  }

  const togglePublished = async (sponsor) => {
    setError(null)
    const { data, error: updateError } = await supabase
      .from('sponsors')
      .update({ published: !sponsor.published })
      .eq('id', sponsor.id)
      .select('id')

    if (updateError) setError(updateError.message)
    else if (!data || data.length === 0) setError("Modification refusée : tu n'es pas organisateur de cet événement.")
    else loadSponsors()
  }

  const handleDelete = async (sponsor) => {
    if (!window.confirm(`Supprimer le sponsor « ${sponsor.name} » ?`)) return
    setError(null)

    const { data, error: deleteError } = await supabase
      .from('sponsors')
      .delete()
      .eq('id', sponsor.id)
      .select('id')

    if (deleteError) setError(deleteError.message)
    else if (!data || data.length === 0) setError("Suppression refusée : tu n'es pas organisateur de cet événement.")
    else loadSponsors()
  }

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <p className="section-label">Partenaires</p>
          <h2 className="section-heading text-xl mt-1">Sponsors</h2>
        </div>
        {isOrganizer && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className={showForm ? 'btn-outline btn-sm' : 'btn-ghost-gold btn-sm'}
          >
            {showForm ? 'Annuler' : '+ Ajouter un sponsor'}
          </button>
        )}
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}

      {isOrganizer && showForm && (
        <form onSubmit={handleSubmit} className="card p-5 space-y-4 mb-6">
          <div>
            <label htmlFor="sponsor-name" className="form-label">Nom</label>
            <input
              id="sponsor-name"
              className="input-field"
              value={form.name}
              onChange={updateField('name')}
              required
            />
          </div>

          <div>
            <label htmlFor="sponsor-tier" className="form-label">Niveau</label>
            <select
              id="sponsor-tier"
              className="select-field"
              value={form.tier}
              onChange={updateField('tier')}
            >
              {Object.entries(TIERS).map(([value, t]) => (
                <option key={value} value={value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sponsor-website" className="form-label">Site web (optionnel)</label>
            <input
              id="sponsor-website"
              className="input-field font-mono"
              placeholder="exemple.com"
              value={form.website}
              onChange={updateField('website')}
            />
          </div>

          <div>
            <label htmlFor="sponsor-benefits" className="form-label">Avantages (optionnel)</label>
            <textarea
              id="sponsor-benefits"
              className="textarea-field"
              rows={3}
              value={form.benefits}
              onChange={updateField('benefits')}
            />
          </div>

          <p className="text-xs text-taupe">
            Le sponsor est créé en brouillon : il ne sera visible du public qu'après publication.
          </p>

          <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
            {saving ? 'Enregistrement…' : 'Ajouter le sponsor'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="skeleton h-40 w-full" />
          <div className="skeleton h-40 w-full" />
        </div>
      ) : sponsors.length === 0 ? (
        <EmptyState title="Aucun sponsor" body="Les partenaires de l'événement apparaîtront ici." />
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sponsors.map((s) => {
            const tier = TIERS[s.tier] || TIERS.partner
            return (
              <li
                key={s.id}
                className="card p-5 sm:p-6 flex flex-col"
                style={{ overflowWrap: 'anywhere', borderLeft: `6px solid ${tier.color}` }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center font-display text-2xl font-semibold shrink-0"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: `1px solid ${tier.color}66`,
                      color: tier.color,
                    }}
                  >
                    {(s.name || '?').trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-xl font-semibold leading-snug tracking-tight text-white">
                      {s.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Pill mono dot={false} color={tier.color}>{tier.label}</Pill>
                      {isOrganizer && (
                        <Pill mono dot={false} color={s.published ? '#34C38F' : '#9AA3B5'}>
                          {s.published ? 'Publié' : 'Brouillon'}
                        </Pill>
                      )}
                    </div>
                  </div>
                </div>

                {s.benefits && (
                  <div className="mt-4">
                    <p className="section-label mb-2">Avantages</p>
                    <p className="text-[15px] leading-7 text-white/75 whitespace-pre-line border-l-2 border-white/15 pl-4">
                      {s.benefits}
                    </p>
                  </div>
                )}

                {(s.website || isOrganizer) && (
                  <div className="mt-auto pt-5">
                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-white/10">
                      {s.website && (
                        <a
                          href={s.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-outline btn-sm"
                        >
                          {hostOf(s.website)} ↗
                        </a>
                      )}
                      {isOrganizer && (
                        <>
                          <button type="button" className="btn-outline btn-sm" onClick={() => togglePublished(s)}>
                            {s.published ? 'Dépublier' : 'Publier'}
                          </button>
                          <button type="button" className="btn-danger btn-sm" onClick={() => handleDelete(s)}>
                            Supprimer
                          </button>
                        </>
                      )}
                    </div>
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