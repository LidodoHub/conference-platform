import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { frError } from '../../lib/errors'
import { STATUS_LABELS, SUBMISSION_COLOR } from '../../lib/constants'
import Stat from '../../components/ui/Stat'
import { StackedBar, BarList, Columns } from '../../components/charts/Charts'
import { useLanguage } from '../../context/LanguageContext'

const count = (table, filter) => {
  let q = supabase.from(table).select('id', { count: 'exact', head: true })
  if (filter) q = filter(q)
  return q
}

const monthKey = (iso) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Vue plateforme pour l'administrateur. Les chiffres dépendent de ce que la RLS laisse lire à l'admin.
export default function PlatformStats() {
  const { t, locale } = useLanguage()
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
      label: d.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
      short: d.toLocaleDateString(locale, { month: 'short' }).replace('.', ''),
    })
  }
  const perMonth = data.subs.reduce((acc, s) => {
    if (s.submitted_at) acc[monthKey(s.submitted_at)] = (acc[monthKey(s.submitted_at)] || 0) + 1
    return acc
  }, {})

  const subStatusLabel = (k) => t(`submissions.${k === 'revision_requested' ? 'revisionRequested' : k}`)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={t('platformStats.accounts')} value={data.users} />
        <Stat label={t('platformStats.events')} value={data.events.length} detail={t('platformStats.publishedDetail', { count: eventStatus.published || 0 })} />
        <Stat label={t('platformStats.submittedPapers')} value={data.subs.length} detail={t('platformStats.reviewsDetail', { count: data.reviews })} />
        <Stat label={t('platformStats.validatedRegistrations')} value={data.validated} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
        <section className="card-panel">
          <h3 className="font-semibold text-fg">{t('platformStats.submissionsPerMonth')}</h3>
          <p className="text-sm text-muted mb-8">{t('platformStats.lastTwelveMonths')}</p>
          <Columns
            label={t('platformStats.submissionsPerMonth')}
            points={months.map((m) => ({ ...m, value: perMonth[m.key] || 0 }))}
          />
        </section>

        <section className="card-panel">
          <h3 className="font-semibold text-fg mb-5">{t('platformStats.eventsByStatus')}</h3>
          <BarList
            color="var(--color-info)"
            items={Object.keys(STATUS_LABELS).map((k) => ({
              key: k,
              label: t(`eventCard.statuses.${k}`),
              value: eventStatus[k] || 0,
            }))}
          />
        </section>
      </div>

      <section className="card-panel">
        <h3 className="font-semibold text-fg mb-5">{t('platformStats.paperDecisions')}</h3>
        <StackedBar
          label={t('platformStats.paperDistribution')}
          segments={['submitted', 'revision_requested', 'accepted', 'rejected'].map((k) => ({
            label: subStatusLabel(k),
            value: subStatus[k] || 0,
            color: SUBMISSION_COLOR[k],
          }))}
        />
      </section>
    </div>
  )
}
