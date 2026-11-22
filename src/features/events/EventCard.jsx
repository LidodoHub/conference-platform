import { MapPinIcon, ArrowUpRightIcon, ArrowRightIcon, CalendarBlankIcon } from '@phosphor-icons/react'
import EventCover from '../../components/ui/EventCover'
import { cleanDescription } from '../../lib/cover'
import { TYPE_LABELS, STATUS_LABELS, STATUS_BADGE, FORMAT_LABELS, ROLE_LABELS, PHASE_LABELS, formatDateRange } from '../../lib/constants'

const dayParts = (d) => {
  if (!d) return null
  const date = new Date(`${String(d).slice(0, 10)}T00:00:00`)
  return {
    day: date.getDate(),
    month: date.toLocaleDateString('fr-FR', { month: 'short' }),
    year: date.getFullYear(),
  }
}

const countdownBadge = (ev) => {
  if (!ev.start_date) return null
  const today = new Date().toISOString().slice(0, 10)
  if (ev.start_date <= today && today <= (ev.end_date || ev.start_date)) {
    return { label: "En cours", cls: 'bg-ok text-white font-semibold' }
  }
  const diffDays = Math.round((new Date(`${ev.start_date}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000)
  if (diffDays < 0) return { label: 'Clôturé', cls: 'bg-white/20 text-white/75' }
  if (diffDays === 1) return { label: 'Demain', cls: 'bg-accent text-on-accent font-bold' }
  if (diffDays <= 7) return { label: `J-${diffDays}`, cls: 'bg-warn text-white font-bold' }
  return { label: `Dans ${diffDays} j`, cls: 'bg-white/20 text-white backdrop-blur-xs font-medium' }
}

function CoverDate({ date, large = false }) {
  if (!date) return null
  return (
    <div className="flex items-center gap-2.5">
      <div className="bg-surface/90 dark:bg-[#18181B]/90 backdrop-blur-md border border-line/60 rounded-xl px-2.5 py-1.5 text-center text-fg dark:text-white min-w-[48px] shadow-xs">
        <span className="block text-xs font-bold uppercase tracking-wider text-muted dark:text-white/80 leading-none">
          {date.month}
        </span>
        <span className={`num block font-bold leading-none mt-1 text-fg dark:text-white ${large ? 'text-3xl' : 'text-2xl'}`}>
          {date.day}
        </span>
      </div>
      <div>
        <span className="block text-xs font-semibold text-fg dark:text-white/95 leading-tight">
          {date.year}
        </span>
        <span className="block text-xs text-muted dark:text-white/70 leading-tight mt-0.5">
          Calendrier officiel
        </span>
      </div>
    </div>
  )
}

function Meta({ event }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`w-fit self-start shrink-0 ${STATUS_BADGE[event.status] || 'badge-draft'}`}>{STATUS_LABELS[event.status] || event.status}</span>
      {['published', 'ongoing'].includes(event.status) && event.phase && (
        <span className="badge-type w-fit self-start shrink-0">{PHASE_LABELS[event.phase]}</span>
      )}
    </div>
  )
}

// Carte d'événement avec cartel-date académique et décompte temporel.
export default function EventCard({ event, role, onOpen, style }) {
  const when = dayParts(event.start_date)
  const timer = countdownBadge(event)

  return (
    <button
      type="button"
      onClick={() => onOpen(event.id)}
      className="group card overflow-hidden text-left flex flex-col rounded-2xl border border-black/[0.04] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-[0_12px_28px_rgba(0,0,0,0.09)] dark:hover:shadow-lift hover:-translate-y-0.5 hover:border-black/[0.08] dark:hover:border-white/[0.12] transition-all duration-200 active:translate-y-0 active:scale-[0.985] cursor-pointer"
      style={style}
    >
      <EventCover seed={event.id} event={event} className="h-36 sm:h-44 p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 relative z-10">
          <span className="text-xs font-medium text-fg dark:text-white/90 px-2.5 py-0.5 rounded-full bg-surface/90 dark:bg-[#222226] border border-line/50 backdrop-blur-xs w-fit self-start shrink-0">
            {TYPE_LABELS[event.type] || event.type}
            {event.format && event.format !== 'onsite' && <span className="text-muted dark:text-white/70"> • {FORMAT_LABELS[event.format].toLowerCase()}</span>}
          </span>
          {timer && (
            <span className={`text-xs uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs w-fit self-start shrink-0 ${timer.cls}`}>
              {timer.label}
            </span>
          )}
        </div>

        <div className="relative z-10">
          <CoverDate date={when} />
        </div>

        <span
          className="absolute right-4 bottom-4 inline-flex w-8 h-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-200 z-10"
          aria-hidden="true"
        >
          <ArrowUpRightIcon size={15} weight="bold" />
        </span>
      </EventCover>

      <div className="flex-1 flex flex-col p-4 sm:p-5 space-y-3">
        <Meta event={event} />
        <h3 className="font-semibold text-base sm:text-[17px] leading-snug tracking-tight text-fg group-hover:text-fg dark:group-hover:text-white transition-colors" style={{ overflowWrap: 'anywhere' }}>
          {event.title}
        </h3>
        <div className="mt-auto pt-3 flex items-center justify-between gap-3 text-xs text-muted border-t border-line/50">
          <span className="min-w-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 text-muted truncate">
            {event.location ? (
              <>
                <MapPinIcon size={14} className="shrink-0 text-muted" aria-hidden="true" />
                <span className="truncate">{event.location}</span>
              </>
            ) : (
              <span>Campus USTO-MB</span>
            )}
          </span>
          {role && <span className="shrink-0 font-semibold text-muted">{ROLE_LABELS[role]}</span>}
        </div>
      </div>
    </button>
  )
}

// Événement à la une : grande carte horizontale.
export function FeaturedEventCard({ event, role, onOpen }) {
  const when = dayParts(event.start_date)
  const timer = countdownBadge(event)

  return (
    <button
      type="button"
      onClick={() => onOpen(event.id)}
      className="group card overflow-hidden text-left w-full grid grid-cols-1 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-[0_12px_28px_rgba(0,0,0,0.09)] dark:hover:shadow-lift hover:-translate-y-0.5 hover:border-black/[0.08] dark:hover:border-white/[0.12] transition-all duration-200 active:scale-[0.99] cursor-pointer"
    >
      <EventCover seed={event.id} event={event} className="min-h-48 md:min-h-80 p-5 sm:p-8 flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 relative z-10">
          <span className="text-sm font-medium text-fg dark:text-white/90 px-3 py-1 rounded-full bg-surface/90 dark:bg-[#222226] border border-line/50 backdrop-blur-xs w-fit self-start shrink-0">
            {TYPE_LABELS[event.type] || event.type} • {(FORMAT_LABELS[event.format] || '').toLowerCase()}
          </span>
          {timer && (
            <span className={`text-xs uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs w-fit self-start shrink-0 ${timer.cls}`}>
              {timer.label}
            </span>
          )}
        </div>
        <div className="relative z-10">
          <CoverDate date={when} large />
        </div>
      </EventCover>

      <div className="p-5 sm:p-8 flex flex-col justify-between">
        <div>
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">
            Événement phare de l'université
          </span>
          <h2 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight leading-snug text-fg group-hover:text-fg dark:group-hover:text-white transition-colors" style={{ overflowWrap: 'anywhere' }}>
            {event.title}
          </h2>
          {event.description && (
            <p className="mt-3 text-sm text-muted leading-relaxed line-clamp-3 max-w-[60ch]">
              {cleanDescription(event.description)}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 text-fg font-medium num">
              <CalendarBlankIcon size={14} className="text-muted shrink-0" />
              <span>{formatDateRange(event.start_date, event.end_date)}</span>
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 text-muted">
                <MapPinIcon size={14} className="text-muted shrink-0" aria-hidden="true" />
                <span>{event.location}</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 pt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line/60">
          <div className="flex items-center gap-2">
            <Meta event={event} />
            {role && <span className="text-xs font-semibold text-muted">{ROLE_LABELS[role]}</span>}
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg dark:text-white group-hover:translate-x-1 transition-transform">
            Ouvrir la conférence
            <ArrowRightIcon size={14} weight="bold" aria-hidden="true" />
          </span>
        </div>
      </div>
    </button>
  )
}
