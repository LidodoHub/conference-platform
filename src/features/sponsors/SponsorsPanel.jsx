import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import EmptyState from '../../components/ui/EmptyState'

const TIER_LABELS = {
  platinum: 'Platine',
  gold: 'Or',
  silver: 'Argent',
  partner: 'Partenaire',
}
const TIER_ORDER = { platinum: 0, gold: 1, silver: 2, partner: 3 }
const EMPTY_FORM = { name: '', tier: 'partner', website: '', benefits: '' }

// on n'accepte que http(s) : "javascript:..." deviendrait "https://javascript:..." donc inoffensif
const normalizeUrl = (value) => {
  const v = value.trim()
  if (!v) return null
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
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
              {Object.entries(TIER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
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
        <div className="space-y-3">
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
        </div>
      ) : sponsors.length === 0 ? (
        <EmptyState title="Aucun sponsor" body="Les partenaires de l'événement apparaîtront ici." />
      ) : (
        <ul className="space-y-3">
          {sponsors.map((s) => (
            <li key={s.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-display font-semibold text-ink leading-snug">{s.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="badge-type">{TIER_LABELS[s.tier] || s.tier}</span>
                  {isOrganizer && (
                    <span className={s.published ? 'badge-published' : 'badge-draft'}>
                      {s.published ? 'Publié' : 'Brouillon'}
                    </span>
                  )}
                </div>
              </div>

              {s.website && (
                <a
                  href={s.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-taupe/70 hover:text-ink mt-2 inline-block break-all"
                >
                  {s.website}
                </a>
              )}

              {s.benefits && (
                <p className="text-sm text-taupe mt-3 leading-relaxed">{s.benefits}</p>
              )}

              {isOrganizer && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <button type="button" className="btn-outline btn-sm" onClick={() => togglePublished(s)}>
                    {s.published ? 'Dépublier' : 'Publier'}
                  </button>
                  <button type="button" className="btn-danger btn-sm" onClick={() => handleDelete(s)}>
                    Supprimer
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}