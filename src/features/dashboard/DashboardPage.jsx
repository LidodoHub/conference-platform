import { useState, useEffect, useCallback } from 'react'
import {
  GavelIcon,
  NotePencilIcon,
  CoinsIcon,
  ArrowCounterClockwiseIcon,
  TicketIcon,
  ShieldCheckIcon,
  PaperPlaneTiltIcon,
  CheckIcon,
  CaretRightIcon,
  ArticleIcon,
  CalendarBlankIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { frError } from '../../lib/errors'
import {
  SUBMISSION_LABELS,
  SUBMISSION_COLOR,
  REVISION_LABELS,
  ROLE_LABELS,
  STATUS_LABELS,
  STATUS_BADGE,
  PHASE_LABELS,
  formatDate,
} from '../../lib/constants'
import SectionTitle from '../../components/ui/SectionTitle'
import { coverStyle } from '../../lib/cover'
import EmptyState from '../../components/ui/EmptyState'

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`

// Construit la liste "À faire" à partir des rôles réels de l'utilisateur dans chaque événement.
function buildTodos({ parts, subs, orgPending, orgPayments, toReview, pendingApprovals, isAdmin }) {
  const todos = []
  const titleOf = (id) => parts.find((p) => p.event_id === id)?.events?.title || 'Événement'

  if (isAdmin && pendingApprovals > 0) {
    todos.push({
      key: 'admin',
      icon: ShieldCheckIcon,
      tone: 'var(--color-warn)',
      title: plural(pendingApprovals, 'événement attend', 'événements attendent') + ' ta validation',
      detail: 'Panel admin',
      target: { view: 'admin' },
    })
  }

  // organisateur
  const byEvent = (rows) =>
    rows.reduce((acc, r) => {
      acc[r.event_id] = (acc[r.event_id] || 0) + 1
      return acc
    }, {})
  Object.entries(byEvent(orgPayments)).forEach(([eventId, n]) =>
    todos.push({
      key: `pay-${eventId}`,
      icon: CoinsIcon,
      tone: 'var(--color-warn)',
      title: plural(n, 'paiement à valider', 'paiements à valider'),
      detail: titleOf(eventId),
      target: { eventId, tab: 'organization', orgTab: 'registrations' },
    }),
  )
  Object.entries(byEvent(orgPending)).forEach(([eventId, n]) =>
    todos.push({
      key: `decide-${eventId}`,
      icon: GavelIcon,
      tone: 'var(--color-info)',
      title: plural(n, 'article à décider', 'articles à décider'),
      detail: titleOf(eventId),
      target: { eventId, tab: 'scientific' },
    }),
  )
  parts
    .filter((p) => p.role_in_event === 'organizer' && p.events?.status === 'draft')
    .forEach((p) =>
      todos.push({
        key: `draft-${p.event_id}`,
        icon: PaperPlaneTiltIcon,
        tone: 'var(--color-muted)',
        title: 'Brouillon à compléter puis à soumettre',
        detail: p.events.title,
        target: { eventId: p.event_id, tab: 'overview' },
      }),
    )

  // reviewer
  Object.entries(byEvent(toReview)).forEach(([eventId, n]) =>
    todos.push({
      key: `review-${eventId}`,
      icon: NotePencilIcon,
      tone: 'var(--color-info)',
      title: plural(n, 'article à relire', 'articles à relire'),
      detail: titleOf(eventId),
      target: { eventId, tab: 'scientific' },
    }),
  )

  // auteur
  subs
    .filter((s) => s.status === 'revision_requested' && s.events?.phase === 'scientific')
    .forEach((s) =>
      todos.push({
        key: `rev-${s.id}`,
        icon: ArrowCounterClockwiseIcon,
        tone: 'var(--color-warn)',
        title: `Corriger et resoumettre « ${s.title} »`,
        detail: s.events?.title,
        target: { eventId: s.event_id, tab: 'scientific' },
      }),
    )

  // participant
  parts
    .filter((p) => p.role_in_event === 'participant' && p.registration_status === 'invited')
    .forEach((p) =>
      todos.push({
        key: `fee-${p.event_id}`,
        icon: TicketIcon,
        tone: 'var(--color-accent-ink)',
        title: 'Régler les frais pour valider ton inscription',
        detail: p.events?.title,
        target: { eventId: p.event_id, tab: 'overview' },
      }),
    )

  return todos
}

export default function DashboardPage({ onOpenEvent, onNavigateEvents, onNavigateAdmin }) {
  const { user, profile, isAdmin } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    const [partsRes, subsRes] = await Promise.all([
      supabase
        .from('event_participants')
        .select('event_id, role_in_event, registration_status, events(id, title, status, phase, start_date, end_date, location)')
        .eq('user_id', user.id),
      supabase
        .from('submissions')
        .select('id, title, status, submitted_at, event_id, events(id, title, phase), decisions(status, revision_type, decided_at)')
        .eq('author_id', user.id)
        .order('submitted_at', { ascending: false }),
    ])

    if (partsRes.error || subsRes.error) {
      setError(frError(partsRes.error || subsRes.error))
      return
    }

    const parts = partsRes.data.filter((p) => p.events)
    const orgIds = parts.filter((p) => p.role_in_event === 'organizer').map((p) => p.event_id)
    const revIds = parts
      .filter((p) => p.role_in_event === 'reviewer' && p.events.phase === 'scientific')
      .map((p) => p.event_id)

    const empty = Promise.resolve({ data: [] })
    const [pendingRes, paymentsRes, reviewRes, approvalsRes] = await Promise.all([
      orgIds.length
        ? supabase.from('submissions').select('id, event_id').in('event_id', orgIds).eq('status', 'submitted')
        : empty,
      orgIds.length
        ? supabase
            .from('event_participants')
            .select('id, event_id')
            .in('event_id', orgIds)
            .eq('registration_status', 'payment_submitted')
        : empty,
      revIds.length
        ? supabase
            .from('submissions')
            .select('id, event_id, author_id, reviews(reviewer_id)')
            .in('event_id', revIds)
            .eq('status', 'submitted')
        : empty,
      isAdmin
        ? supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval')
        : Promise.resolve({ count: 0 }),
    ])

    const toReview = (reviewRes.data || []).filter(
      (s) => s.author_id !== user.id && !(s.reviews || []).some((r) => r.reviewer_id === user.id),
    )

    setData({
      parts,
      subs: subsRes.data,
      orgPending: pendingRes.data || [],
      orgPayments: paymentsRes.data || [],
      toReview,
      pendingApprovals: approvalsRes.count || 0,
    })
  }, [user.id, isAdmin])

  useEffect(() => {
    load()
  }, [load])

  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0]
  const todos = data ? buildTodos({ ...data, isAdmin }) : []

  const open = (target) => {
    if (target.view === 'admin') onNavigateAdmin()
    else onOpenEvent(target.eventId, target)
  }

  const statusOf = (s) => {
    if (s.status === 'revision_requested') {
      const last = [...(s.decisions || [])]
        .filter((d) => d.status === 'revision_requested')
        .sort((a, b) => new Date(b.decided_at) - new Date(a.decided_at))[0]
      if (last?.revision_type) return REVISION_LABELS[last.revision_type]
    }
    return SUBMISSION_LABELS[s.status] || s.status
  }

  return (
    <div className="page-container">
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-fg">
          Bonjour{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-muted mt-2">
          {!data
            ? 'Chargement de ton espace…'
            : todos.length === 0
              ? 'Rien ne t’attend pour le moment.'
              : `${plural(todos.length, 'chose demande', 'choses demandent')} ton attention.`}
        </p>
      </header>

      {error && <div className="alert-error mb-6">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-x-10 gap-y-12 items-start">
        {/* À faire */}
        <section aria-labelledby="todo-title">
          <SectionTitle title={<span id="todo-title">À faire</span>} count={data ? todos.length : null} />
          {!data ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-[68px]" />
              ))}
            </div>
          ) : todos.length === 0 ? (
            <div className="card px-5 py-6 flex items-center gap-4">
              <span className="inline-flex w-10 h-10 items-center justify-center rounded-xl bg-ok/12 text-ok shrink-0">
                <CheckIcon size={20} weight="bold" />
              </span>
              <div>
                <p className="font-medium text-fg">Tout est à jour</p>
                <p className="text-sm text-muted">
                  Les décisions, paiements et relectures qui te concernent apparaîtront ici.
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {todos.map(({ key, icon: Icon, tone, title, detail, target }, i) => (
                <li key={key} className="rise" style={{ '--i': i }}>
                  <button
                    type="button"
                    onClick={() => open(target)}
                    className="group w-full text-left card px-4 py-3.5 flex items-center gap-4 hover:border-fg/25 transition-colors"
                  >
                    <span
                      className="inline-flex w-10 h-10 items-center justify-center rounded-xl shrink-0"
                      style={{ color: tone, background: `color-mix(in srgb, ${tone} 13%, transparent)` }}
                    >
                      <Icon size={20} weight="duotone" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-fg leading-snug" style={{ overflowWrap: 'anywhere' }}>
                        {title}
                      </span>
                      {detail && <span className="block text-sm text-muted truncate">{detail}</span>}
                    </span>
                    <CaretRightIcon
                      size={16}
                      className="text-faint group-hover:text-fg group-hover:translate-x-0.5 transition-transform shrink-0"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Mes événements */}
        <section aria-labelledby="my-events-title">
          <SectionTitle
            title={<span id="my-events-title">Mes événements</span>}
            count={data ? data.parts.length : null}
            actions={
              <button type="button" onClick={onNavigateEvents} className="btn-ghost btn-sm -mr-2">
                Tous les événements
              </button>
            }
          />
          {!data ? (
            <div className="skeleton h-48" />
          ) : data.parts.length === 0 ? (
            <EmptyState
              compact
              icon={CalendarBlankIcon}
              title="Aucun événement"
              body="Soumets un article à un événement publié, ou crée le tien."
              action={
                <button type="button" onClick={onNavigateEvents} className="btn-outline btn-sm">
                  Voir les événements
                </button>
              }
            />
          ) : (
            <ul className="card divide-y divide-line overflow-hidden">
              {data.parts
                .slice()
                .sort((a, b) => (a.events.start_date || '').localeCompare(b.events.start_date || ''))
                .map((p) => (
                  <li key={p.event_id}>
                    <button
                      type="button"
                      onClick={() => onOpenEvent(p.event_id)}
                      className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-fg/4 transition-colors"
                    >
                      <span className="w-11 h-11 rounded-xl shrink-0" style={coverStyle(p.event_id)} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-fg truncate">{p.events.title}</span>
                        <span className="block text-[13px] text-muted num">
                          {formatDate(p.events.start_date, { day: 'numeric', month: 'short', year: 'numeric' })}
                          {', '}
                          {PHASE_LABELS[p.events.phase]?.replace('Phase ', 'phase ') || ''}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs font-medium text-accent-ink">{ROLE_LABELS[p.role_in_event]}</span>
                        <span className={STATUS_BADGE[p.events.status]}>{STATUS_LABELS[p.events.status]}</span>
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </section>

        {/* Mes articles */}
        <section aria-labelledby="my-papers-title" className="lg:col-span-2">
          <SectionTitle title={<span id="my-papers-title">Mes articles</span>} count={data ? data.subs.length : null} />
          {!data ? (
            <div className="skeleton h-32" />
          ) : data.subs.length === 0 ? (
            <EmptyState
              compact
              icon={ArticleIcon}
              title="Aucun article soumis"
              body="Ouvre un événement en phase scientifique, onglet Scientifique, pour déposer un article."
            />
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.subs.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onOpenEvent(s.event_id, { tab: 'scientific' })}
                    className="entity w-full text-left hover:border-fg/25 transition-colors"
                    style={{ '--stripe': SUBMISSION_COLOR[s.status] }}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium" style={{ color: SUBMISSION_COLOR[s.status] }}>
                        {statusOf(s)}
                      </span>
                      <span className="text-xs text-faint num">
                        {formatDate(s.submitted_at, { day: 'numeric', month: 'short' })}
                      </span>
                    </span>
                    <span className="block mt-1.5 font-medium text-fg leading-snug">{s.title}</span>
                    <span className="block mt-1 text-[13px] text-muted truncate">{s.events?.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
