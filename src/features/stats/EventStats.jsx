import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { frError } from '../../lib/errors'
import { SUBMISSION_LABELS, SUBMISSION_COLOR, RECOMMENDATION_LABELS, RECOMMENDATION_COLOR } from '../../lib/constants'
import Stat from '../../components/ui/Stat'
import { StackedBar, BarList, Columns, Ratio, DataTable } from '../../components/charts/Charts'

const dayKey = (iso) => String(iso).slice(0, 10)
const money = (n) => `${Number(n).toLocaleString('fr-FR')} DA`

// Statistiques d'un événement, pour son organisateur.
export default function EventStats({ eventId, submissions, participants }) {
  const [extra, setExtra] = useState(null)
  const [error, setError] = useState(null)

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
    label: `note ${n}`,
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
      const key = d.toISOString().slice(0, 10)
      perDay.push({
        key,
        label: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }),
        short: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', ''),
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

  return (
    <div className="space-y-6">
      {error && <div className="alert-error">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Articles soumis" value={submissions.length} detail={`${decided} décidés`} />
        <Stat label="Reviews envoyées" value={reviews.length} detail={`${reviewed} articles relus`} />
        <Stat label="Inscrits validés" value={validatedIds.size} detail={`sur ${reg.length} invités`} />
        <Stat label="Revenus validés" value={extra ? money(revenue) : '…'} />
      </div>

      <section className="card-panel">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-56 shrink-0">
            <Ratio
              value={accepted}
              total={accepted + rejected}
              label={`Taux d'acceptation (${accepted} acceptés sur ${accepted + rejected} décisions finales)`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-fg mb-4">Où en sont les articles</h3>
            <StackedBar
              label="Répartition des articles par statut"
              segments={['submitted', 'revision_requested', 'accepted', 'rejected'].map((k) => ({
                label: SUBMISSION_LABELS[k],
                value: count(k),
                color: SUBMISSION_COLOR[k],
              }))}
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card-panel">
          <h3 className="font-semibold text-fg">Avancement des reviews</h3>
          <p className="text-sm text-muted">
            {submissions.length
              ? `${reviewed} articles sur ${submissions.length} ont au moins une review.`
              : 'Aucun article pour le moment.'}
            {avg != null && ` Note moyenne : ${avg.toFixed(1)} / 5.`}
          </p>
          <div className="mt-8">
            <Columns label="Distribution des notes" points={scoreDist} color="var(--color-info)" height={110} />
          </div>
          <div className="mt-6">
            <BarList
              items={Object.entries(RECOMMENDATION_LABELS).map(([k, label]) => ({
                key: k,
                label,
                value: reviews.filter((r) => r.recommendation === k).length,
                color: RECOMMENDATION_COLOR[k],
              }))}
              max={Math.max(1, reviews.length)}
            />
          </div>
        </section>

        <section className="card-panel">
          <h3 className="font-semibold text-fg">Dépôts par jour</h3>
          <p className="text-sm text-muted mb-8">Du premier au dernier article reçu.</p>
          {perDay.length ? (
            <>
              <Columns label="Articles déposés par jour" points={perDay} />
              <DataTable
                caption="Articles déposés par jour"
                columns={['Jour', 'Articles']}
                rows={perDay.filter((p) => p.value > 0).map((p) => [p.label, p.value])}
              />
            </>
          ) : (
            <p className="text-sm text-muted">Aucun dépôt pour le moment.</p>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card-panel">
          <h3 className="font-semibold text-fg mb-5">Inscriptions</h3>
          <BarList
            max={Math.max(1, reg.length)}
            items={[
              { key: 'all', label: 'Invités', value: reg.length, color: 'var(--color-st-muted)' },
              { key: 'declared', label: 'Paiement déclaré', value: regCount('payment_submitted') + regCount('validated'), color: 'var(--color-warn)' },
              { key: 'validated', label: 'Inscriptions validées', value: regCount('validated'), color: 'var(--color-ok)' },
            ]}
          />
        </section>

        <section className="card-panel">
          <h3 className="font-semibold text-fg mb-5">Sessions</h3>
          {!extra ? (
            <div className="skeleton h-32" />
          ) : extra.sessions.length === 0 ? (
            <p className="text-sm text-muted">Aucune session créée.</p>
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
                  detail: `présents, ${papers} article${papers > 1 ? 's' : ''}`,
                }
              })}
            />
          )}
        </section>
      </div>
    </div>
  )
}
