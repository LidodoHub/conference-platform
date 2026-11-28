import { useState } from 'react'
import {
  PencilSimpleIcon,
  PaperPlaneTiltIcon,
  LockSimpleIcon,
  ArrowCounterClockwiseIcon,
  TrashIcon,
  ArrowRightIcon,
  InfoIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { writeError } from '../../lib/errors'
import { useConfirm } from '../../context/ConfirmContext'
import { useLanguage } from '../../context/LanguageContext'
import { STATUS_BADGE } from '../../lib/constants'
import { cleanDescription } from '../../lib/cover'
import EventForm from './EventForm'

const parseDay = (d) => {
  if (!d) return null
  const str = String(d)
  return str.length <= 10 ? new Date(`${str}T00:00:00`) : new Date(str)
}

const fmtDateRange = (start, end, locale) => {
  const opts = { day: 'numeric', month: 'long', year: 'numeric' }
  const a = parseDay(start)?.toLocaleDateString(locale, opts) || ''
  if (!end || String(end).slice(0, 10) === String(start).slice(0, 10)) return a
  return `${a} → ${parseDay(end)?.toLocaleDateString(locale, opts) || ''}`
}

// Onglet Organisation > Événement : informations, publication, phase, suppression du brouillon.
export default function EventSettings({ event, pendingCount, onChanged, onDeleted }) {
  const confirm = useConfirm()
  const { t, locale } = useLanguage()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const isClosed = ['closed', 'archived'].includes(event.status)
  const isLive = event.status === 'ongoing'
  const lockedFields = isLive ? ['start_date', 'end_date', 'type', 'format'] : []

  const update = async (changes, okText) => {
    setError(null)
    setNotice(null)
    const res = await supabase.from('events').update(changes).eq('id', event.id).select('id')
    const msg = writeError(res, t('errors.saveRefused'))
    if (msg) {
      setError(msg)
      return false
    }
    if (okText) setNotice(okText)
    onChanged()
    return true
  }

  const saveInfo = async (values) => {
    const ok = await update(values, t('common.saved'))
    if (ok) setEditing(false)
  }

  const changePhase = async (phase) => {
    if (phase === 'organizational') {
      const msg =
        pendingCount > 0
          ? t('eventSettings.closePhasePending', { count: pendingCount })
          : t('eventSettings.closePhaseEmpty')
      const ok = await confirm({
        title: t('eventSettings.closePhaseTitle'),
        description: msg,
        confirmLabel: t('eventSettings.closePhaseConfirm'),
        variant: 'default',
      })
      if (!ok) return
    }
    update(
      { phase },
      phase === 'organizational'
        ? t('eventSettings.orgPhaseOpened')
        : t('eventSettings.sciPhaseReopened'),
    )
  }

  const LIFECYCLE = {
    published: {
      to: 'ongoing',
      label: t('eventSettings.startEventLabel'),
      hint: t('eventSettings.startEventHint'),
    },
    ongoing: {
      to: 'closed',
      label: t('eventSettings.closeEventLabel'),
      hint: t('eventSettings.closeEventHint'),
    },
    closed: {
      to: 'archived',
      label: t('eventSettings.archiveLabel'),
      hint: t('eventSettings.archiveHint'),
    },
  }
  const next = LIFECYCLE[event.status]
  const advance = async () => {
    const ok = await confirm({
      title: `${next.label} ?`,
      description: next.hint,
      confirmLabel: next.label,
      variant: 'default',
    })
    if (!ok) return
    update({ status: next.to }, t('eventSettings.statusUpdated'))
  }

  const requestPublication = () =>
    update(
      { status: 'pending_approval' },
      t('eventSettings.publicationRequested'),
    )

  const deleteDraft = async () => {
    const ok = await confirm({
      title: t('eventSettings.deleteDraftTitle'),
      description: t('eventSettings.deleteDraftDesc'),
      confirmLabel: t('common.delete'),
      variant: 'danger',
    })
    if (!ok) return
    setError(null)
    const res = await supabase.from('events').delete().eq('id', event.id).select('id')
    const msg = writeError(res, t('errors.deleteRefused'))
    if (msg) setError(msg)
    else onDeleted()
  }

  return (
    <div className="space-y-4 max-w-3xl">
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

      {/* Informations */}
      <section className="card-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-fg">{t('eventSettings.infoTitle')}</h3>
            <p className="text-sm text-muted mt-0.5">
              {t('eventSettings.infoSubtitle')}
            </p>
          </div>
          {isClosed ? (
            <span className="text-xs font-semibold text-muted inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-line shrink-0">
              <LockSimpleIcon size={14} weight="bold" className="text-muted" aria-hidden="true" />
              {t('eventSettings.closedLocked')}
            </span>
          ) : !editing ? (
            <button type="button" className="btn-outline btn-sm" onClick={() => setEditing(true)}>
              <PencilSimpleIcon size={15} aria-hidden="true" />
              {t('common.edit')}
            </button>
          ) : null}
        </div>

        {editing ? (
          <div className="mt-6">
            {isLive && (
              <div className="alert-info text-xs flex items-center gap-2 mb-4 p-3 rounded-xl bg-accent/10 border border-accent/25 text-fg">
                <InfoIcon size={18} className="text-accent-ink shrink-0" aria-hidden="true" />
                <span>
                  <strong>{t('eventSettings.liveEventTitle')}</strong>{' '}
                  {t('eventSettings.liveEventDesc')}
                </span>
              </div>
            )}
            <EventForm
              initial={{ ...event, description: cleanDescription(event.description || ''), location: event.location || '' }}
              submitLabel={t('common.save')}
              busyLabel={t('common.saving')}
              onSubmit={saveInfo}
              onCancel={() => setEditing(false)}
              lockedFields={lockedFields}
            />
          </div>
        ) : (
          <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-muted">{t('eventSettings.typeAndFormat')}</dt>
              <dd className="text-fg mt-0.5">
                {t(`eventCard.types.${event.type}`) || event.type}, {(t(`eventCard.formats.${event.format}`) || event.format || '').toLowerCase()}
              </dd>
            </div>
            <div>
              <dt className="text-muted">{t('eventSettings.dates')}</dt>
              <dd className="text-fg mt-0.5 num">{fmtDateRange(event.start_date, event.end_date, locale)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">{t('eventSettings.location')}</dt>
              <dd className="text-fg mt-0.5">{event.location || t('eventSettings.notSpecified')}</dd>
            </div>
          </dl>
        )}
      </section>

      {/* Publication */}
      <section className="card-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-fg flex items-center gap-2">
              {t('eventSettings.publicationTitle')}
              <span className={STATUS_BADGE[event.status]}>{t(`eventCard.statuses.${event.status}`) || event.status}</span>
            </h3>
            <p className="text-sm text-muted mt-1 max-w-[60ch]">
              {event.status === 'draft' && t('eventSettings.statusDraftDesc')}
              {event.status === 'pending_approval' && t('eventSettings.statusPendingDesc')}
              {['published', 'ongoing'].includes(event.status) && t('eventSettings.statusPublishedDesc')}
              {['closed', 'archived'].includes(event.status) && t('eventSettings.statusClosedDesc')}
            </p>
          </div>
          {next && (
            <button type="button" className="btn-outline" onClick={advance} title={next.hint}>
              <ArrowRightIcon size={16} className="rtl:rotate-180" aria-hidden="true" />
              {next.label}
            </button>
          )}
          {event.status === 'pending_approval' && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() =>
                update(
                  { status: 'draft' },
                  t('eventSettings.requestWithdrawn'),
                )
              }
            >
              {t('eventSettings.withdrawRequest')}
            </button>
          )}
          {event.status === 'draft' && (
            <button type="button" className="btn-accent" onClick={requestPublication}>
              <PaperPlaneTiltIcon size={16} aria-hidden="true" />
              {t('eventSettings.requestPublication')}
            </button>
          )}
        </div>
      </section>

      {/* Phase */}
      <section className="card-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-[60ch]">
            <h3 className="font-semibold text-fg">{t(`eventCard.phases.${event.phase}`) || event.phase}</h3>
            <p className="text-sm text-muted mt-1">
              {event.phase === 'scientific'
                ? t('eventSettings.sciPhaseDesc')
                : t('eventSettings.orgPhaseDesc')}
              {event.phase === 'scientific' && pendingCount > 0 && (
                <span className="text-warn">
                  {' '}
                  {t('eventSettings.pendingPapersCount', { count: pendingCount })}
                </span>
              )}
            </p>
          </div>
          {event.phase === 'scientific' ? (
            <button type="button" className="btn-primary" onClick={() => changePhase('organizational')}>
              <LockSimpleIcon size={16} aria-hidden="true" />
              {t('eventSettings.closeSciPhaseBtn')}
            </button>
          ) : (
            <button type="button" className="btn-outline" onClick={() => changePhase('scientific')}>
              <ArrowCounterClockwiseIcon size={16} aria-hidden="true" />
              {t('eventSettings.reopenSciPhaseBtn')}
            </button>
          )}
        </div>
      </section>

      {event.status === 'draft' && (
        <section className="rounded-2xl border border-bad/30 p-5 sm:p-7 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-fg">{t('eventSettings.deleteDraftSectionTitle')}</h3>
            <p className="text-sm text-muted mt-1">
              {t('eventSettings.deleteDraftSectionDesc')}
            </p>
          </div>
          <button type="button" className="btn-danger" onClick={deleteDraft}>
            <TrashIcon size={16} aria-hidden="true" />
            {t('common.delete')}
          </button>
        </section>
      )}
    </div>
  )
}
