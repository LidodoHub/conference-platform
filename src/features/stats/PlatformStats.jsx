import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { frError } from '../../lib/errors'
import { STATUS_LABELS, SUBMISSION_LABELS, SUBMISSION_COLOR } from '../../lib/constants'
import Stat from '../../components/ui/Stat'
import { StackedBar, BarList, Columns } from '../../components/charts/Charts'

const count = (table, filter) => {
  let q = supabase.from(table).select('id', { count: 'exact', head: true })
  if (filter) q = filter(q)
  return q
}

const monthKey = (iso) => String(iso).slice(0, 7)

// Vue plateforme pour l'administrateur. Les chiffres dépendent de ce que la RLS laisse lire à l'admin.
export default function PlatformStats() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [users, events, subs, reviews, validated] = await Promise.all([
        count('profiles'),
        supabase.from('events').select('status'),
        supabase.from('submissions').select('status, submitted_at'),
        count('reviews'),
        count('event_participants', (q) => q.eq('registration_status', 'validated')),
      ])
      const failed = [users, events, subs, reviews, validated].find((r) => r.error)
      if (cancelled) return
      if (failed) {
        setError(frError(failed.error))
        return
      }
      setData({
        users: users.count ?? 0,
        events: events.data,
        subs: subs.data,
        reviews: reviews.count ?? 0,
        validated: validated.count ?? 0,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <div className="alert-error">{error}</div>
  if (!data)
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24" />
        ))}
      </div>
    )

  const byStatus = (rows) =>
    rows.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1
      return acc
    }, {})
  const eventStatus = byStatus(data.events)
  const subStatus = byStatus(data.subs)

  // dépôts par mois sur les 12 derniers mois
  const months = []
  const now = new Date()
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      short: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
    })
  }
  const perMonth = data.subs.reduce((acc, s) => {
    if (s.submitted_at) acc[monthKey(s.submitted_at)] = (acc[monthKey(s.submitted_at)] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Comptes" value={data.users} />
        <Stat label="Événements" value={data.events.length} detail={`${eventStatus.published || 0} publiés`} />
        <Stat label="Articles soumis" value={data.subs.length} detail={`${data.reviews} reviews`} />
        <Stat label="Inscriptions validées" value={data.validated} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
        <section className="card-panel">
          <h3 className="font-semibold text-fg">Articles déposés par mois</h3>
          <p className="text-sm text-muted mb-8">Douze derniers mois, tous événements confondus.</p>
          <Columns
            label="Articles déposés par mois"
            points={months.map((m) => ({ ...m, value: perMonth[m.key] || 0 }))}
          />
        </section>

        <section className="card-panel">
          <h3 className="font-semibold text-fg mb-5">Événements par statut</h3>
          <BarList
            color="var(--color-info)"
            items={Object.entries(STATUS_LABELS).map(([k, label]) => ({ key: k, label, value: eventStatus[k] || 0 }))}
          />
        </section>
      </div>

      <section className="card-panel">
        <h3 className="font-semibold text-fg mb-5">Décisions sur les articles</h3>
        <StackedBar
          label="Répartition des articles par statut"
          segments={['submitted', 'revision_requested', 'accepted', 'rejected'].map((k) => ({
            label: SUBMISSION_LABELS[k],
            value: subStatus[k] || 0,
            color: SUBMISSION_COLOR[k],
          }))}
        />
      </section>
    </div>
  )
}
