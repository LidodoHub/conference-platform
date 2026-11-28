import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { frError } from '../../lib/errors'
import { SUBMISSION_COLOR, RECOMMENDATION_LABELS, RECOMMENDATION_COLOR } from '../../lib/constants'
import Stat from '../../components/ui/Stat'
import { StackedBar, BarList, Columns, Ratio, DataTable } from '../../components/charts/Charts'
import { useLanguage } from '../../context/LanguageContext'

// jour local (et non UTC) : sinon minuit à Alger tombe la veille
const pad = (n) => String(n).padStart(2, '0')
const localDay = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const dayKey = (iso) => localDay(new Date(iso))

// Statistiques d'un événement, pour son organisateur.
export default function EventStats({ eventId, submissions, participants }) {
  const { t, locale } = useLanguage()
  const [extra, setExtra] = useState(null)
  const [error, setError] = useState(null)
  const money = (n) => `${Number(n).toLocaleString(locale)} ${t('eventStats.currency')}`

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [payRes, sesRes] = await Promise.all([
        supabase.from('registration_payments').select('user_id, amount, validated_at').eq('event_id', eventId),
        supabase.from('sessions').select('id, title, start_time').eq('event_id', eventId).order('start_time'),
      ])
      const ids = (sesRes.data || []).map((s) => s.id)
      const [assignRes, attRes] = ids.length
        ? await Promise.all([
            supabase.from('session_submissions').select('session_id').in('session_id', ids),
            supabase.from('attendance').select('session_id, profile_id').eq('event_id', eventId),
          ])
        : [{ data: [] }, { data: [] }]
      if (cancelled) return
      const failed = [payRes, sesRes, assignRes, attRes].find((r) => r.error)
      if (failed) setError(frError(failed.error))
      setExtra({
        payments: payRes.data || [],
        sessions: sesRes.data || [],
        assignments: assignRes.data || [],
        attendance: attRes.data || [],
      })
    })()
    return () => {
      cancelled = true
    }
  }, [eventId])

  // --- Soumissions et décisions
  const count = (status) => submissions.filter((s) => s.status === status).length
  const accepted = count('accepted')
  const rejected = count('rejected')
  const decided = submissions.length - count('submitted')

  // --- Reviews
  const reviews = submissions.flatMap((s) => (s.reviews || []).filter((r) => r.recommendation))
  const reviewed = submissions.filter((s) => (s.reviews || []).some((r) => r.recommendation)).length
  const avg = reviews.length ? reviews.reduce((sum, r) => sum + Number(r.score || 0), 0) / reviews.length : null
  const scoreDist = [1, 2, 3, 4, 5].map((n) => ({
    key: n,
    label: t('eventStats.scoreLabel', { n }),
    short: `${n}`,
    value: reviews.filter((r) => Number(r.score) === n).length,
  }))

  // --- Dépôts par jour (du premier au dernier dépôt)
  const days = submissions.filter((s) => s.submitted_at).map((s) => dayKey(s.submitted_at)).sort()
  const perDay = []
  if (days.length) {
    const start = new Date(`${days[0]}T00:00:00`)
    const end = new Date(`${days[days.length - 1]}T00:00:00`)
    for (let d = new Date(start); d <= end && perDay.length < 120; d.setDate(d.getDate() + 1)) {
      const key = localDay(d)
      perDay.push({
        key,
        label: d.toLocaleDateString(locale, { day: 'numeric', month: 'long' }),
        short: d.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace('.', ''),
        value: days.filter((x) => x === key).length,
      })
    }
  }

  // --- Inscriptions
  const reg = participants.filter((p) => p.role_in_event === 'participant')
  const regCount = (st) => reg.filter((p) => p.registration_status === st).length
  const validatedIds = new Set(reg.filter((p) => p.registration_status === 'validated').map((p) => p.user_id))
  const revenue = (extra?.payments || [])
    .filter((p) => p.validated_at && validatedIds.has(p.user_id))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)

  const subStatusLabel = (k) => t(`submissions.${k === 'revision_requested' ? 'revisionRequested' : k}`)

  return (
    <div className="space-y-6">
      {error && <div className="alert-error">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={t('eventStats.submittedPapers')} value={submissions.length} detail={t('eventStats.decidedDetail', { count: decided })} />
        <Stat label={t('eventStats.sentReviews')} value={reviews.length} detail={t('eventStats.reviewedDetail', { count: reviewed })} />
        <Stat label={t('eventStats.validatedRegistrations')} value={validatedIds.size} detail={t('eventStats.outOfInvited', { count: reg.length })} />
        <Stat label={t('eventStats.validatedRevenue')} value={extra ? money(revenue) : '…'} />
      </div>

      <section className="card-panel">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-56 shrink-0">
            <Ratio
              value={accepted}
              total={accepted + rejected}
              label={t('eventStats.acceptanceRate', { accepted, total: accepted + rejected })}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-fg mb-4">{t('eventStats.paperProgress')}</h3>
            <StackedBar
              label={t('eventStats.paperDistribution')}
              segments={['submitted', 'revision_requested', 'accepted', 'rejected'].map((k) => ({
                label: subStatusLabel(k),
                value: count(k),
                color: SUBMISSION_COLOR[k],
              }))}
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card-panel">
          <h3 className="font-semibold text-fg">{t('eventStats.reviewProgress')}</h3>
          <p className="text-sm text-muted">
            {submissions.length
              ? t(reviewed > 1 ? 'eventStats.reviewedSummaryMany' : 'eventStats.reviewedSummaryOne', {
                  reviewed,
                  total: submissions.length,
                })
              : t('eventStats.noPapersYet')}
            {avg != null && ` ${t('eventStats.averageScore', { avg: avg.toFixed(1) })}`}
          </p>
          <div className="mt-8">
            <Columns label={t('eventStats.scoreDistribution')} points={scoreDist} color="var(--color-info)" height={110} />
          </div>
          <div className="mt-6">
            <BarList
              items={Object.keys(RECOMMENDATION_LABELS).map((k) => ({
                key: k,
                label: t(`eventStats.recommendations.${k}`),
                value: reviews.filter((r) => r.recommendation === k).length,
                color: RECOMMENDATION_COLOR[k],
              }))}
              max={Math.max(1, reviews.length)}
            />
          </div>
        </section>

        <section className="card-panel">
          <h3 className="font-semibold text-fg">{t('eventStats.submissionsPerDay')}</h3>
          <p className="text-sm text-muted mb-8">{t('eventStats.firstToLast')}</p>
          {perDay.length ? (
            <>
              <Columns label={t('eventStats.papersPerDayLabel')} points={perDay} />
              <DataTable
                caption={t('eventStats.papersPerDayLabel')}
                columns={[t('eventStats.colDay'), t('eventStats.colPapers')]}
                rows={perDay.filter((p) => p.value > 0).map((p) => [p.label, p.value])}
              />
            </>
          ) : (
            <p className="text-sm text-muted">{t('eventStats.noSubmissionsYet')}</p>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card-panel">
          <h3 className="font-semibold text-fg mb-5">{t('eventStats.registrationsTitle')}</h3>
          <BarList
            max={Math.max(1, reg.length)}
            items={[
              { key: 'all', label: t('eventStats.regInvited'), value: reg.length, color: 'var(--color-st-muted)' },
              { key: 'declared', label: t('eventStats.regDeclared'), value: regCount('payment_submitted') + regCount('validated'), color: 'var(--color-warn)' },
              { key: 'validated', label: t('eventStats.regValidated'), value: regCount('validated'), color: 'var(--color-ok)' },
            ]}
          />
        </section>

        <section className="card-panel">
          <h3 className="font-semibold text-fg mb-5">{t('eventStats.sessionsTitle')}</h3>
          {!extra ? (
            <div className="skeleton h-32" />
          ) : extra.sessions.length === 0 ? (
            <p className="text-sm text-muted">{t('eventStats.noSessionsCreated')}</p>
          ) : (
            <BarList
              max={Math.max(1, validatedIds.size)}
              items={extra.sessions.map((s) => {
                const present = new Set(
                  extra.attendance.filter((a) => a.session_id === s.id).map((a) => a.profile_id),
                ).size
                const papers = extra.assignments.filter((a) => a.session_id === s.id).length
                return {
                  key: s.id,
                  label: s.title,
                  value: present,
                  detail: t(papers > 1 ? 'eventStats.sessionDetailMany' : 'eventStats.sessionDetailOne', { count: papers }),
                }
              })}
            />
          )}
        </section>
      </div>
    </div>
  )
}
