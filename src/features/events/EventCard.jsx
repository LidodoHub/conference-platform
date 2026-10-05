import { MapPinIcon, ArrowUpRightIcon, ArrowRightIcon } from '@phosphor-icons/react'
import EventCover from '../../components/ui/EventCover'
import { TYPE_LABELS, STATUS_LABELS, STATUS_BADGE, FORMAT_LABELS, ROLE_LABELS, PHASE_LABELS, formatDateRange } from '../../lib/constants'

const dayParts = (d) => {
  if (!d) return null
  const date = new Date(`${String(d).slice(0, 10)}T00:00:00`)
  return {
    day: date.getDate(),
    month: date.toLocaleDateString('fr-FR', { month: 'long' }),
    year: date.getFullYear(),
  }
}

function CoverDate({ date, large = false }) {
  if (!date) return null
  return (
    <div className="text-white">
      <span className={`num block font-semibold tracking-tighter leading-[0.85] ${large ? 'text-7xl sm:text-8xl' : 'text-5xl'}`}>
        {date.day}
      </span>
      <span className={`block mt-1.5 text-white/80 first-letter:uppercase ${large ? 'text-base' : 'text-[13px]'}`}>
        {date.month} {date.year}
      </span>
    </div>
  )
}

function Meta({ event }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={STATUS_BADGE[event.status] || 'badge-draft'}>{STATUS_LABELS[event.status] || event.status}</span>
      {['published', 'ongoing'].includes(event.status) && (
        <span className="badge-type">{PHASE_LABELS[event.phase]?.replace('Phase ', 'Phase ')}</span>
      )}
    </div>
  )
}

// Carte d'événement : couverture générée + informations. C'est un vrai bouton (clavier, lecteur d'écran).
export default function EventCard({ event, role, onOpen, style }) {
  const when = dayParts(event.start_date)
  return (
    <button
      type="button"
      onClick={() => onOpen(event.id)}
      className="group card overflow-hidden text-left flex flex-col rise transition-[transform,box-shadow] duration-300 ease-(--ease-out-soft) hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
      style={style}
    >
      <EventCover seed={event.id} className="h-40 p-5 flex flex-col justify-between">
        <span className="text-[13px] font-medium text-white/85">
          {TYPE_LABELS[event.type] || event.type}
          {event.format && event.format !== 'onsite' && <span className="text-white/60">, {FORMAT_LABELS[event.format].toLowerCase()}</span>}
        </span>
        <CoverDate date={when} />
        <span
          className="absolute right-4 top-4 inline-flex w-9 h-9 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-sm opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 transition-all duration-300"
          aria-hidden="true"
        >
          <ArrowUpRightIcon size={16} weight="bold" />
        </span>
      </EventCover>

      <div className="flex-1 flex flex-col p-5">
        <Meta event={event} />
        <h3 className="mt-3 font-semibold text-[17px] leading-snug tracking-tight text-fg" style={{ overflowWrap: 'anywhere' }}>
          {event.title}
        </h3>
        <div className="mt-auto pt-4 flex items-end justify-between gap-3 text-[13px] text-muted">
          <span className="min-w-0 flex items-center gap-1.5">
            {event.location && (
              <>
                <MapPinIcon size={14} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{event.location}</span>
              </>
            )}
          </span>
          {role && <span className="shrink-0 font-medium text-accent-ink">{ROLE_LABELS[role]}</span>}
        </div>
      </div>
    </button>
  )
}

// Événement à la une : grande carte horizontale.
export function FeaturedEventCard({ event, role, onOpen }) {
  const when = dayParts(event.start_date)
  return (
    <button
      type="button"
      onClick={() => onOpen(event.id)}
      className="group card overflow-hidden text-left grid grid-cols-1 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] rise transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]"
    >
      <EventCover seed={event.id} className="min-h-56 md:min-h-80 p-6 sm:p-8 flex flex-col justify-between">
        <span className="text-sm font-medium text-white/85">
          {TYPE_LABELS[event.type] || event.type}, {(FORMAT_LABELS[event.format] || '').toLowerCase()}
        </span>
        <CoverDate date={when} large />
      </EventCover>

      <div className="p-6 sm:p-8 flex flex-col">
        <p className="text-[13px] font-medium text-accent-ink">Prochain événement</p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight leading-[1.15] text-fg" style={{ overflowWrap: 'anywhere' }}>
          {event.title}
        </h2>
        {event.description && <p className="mt-3 text-muted leading-relaxed line-clamp-3 max-w-[60ch]">{event.description}</p>}

        <div className="mt-5 space-y-1.5 text-sm text-muted">
          <p className="num">{formatDateRange(event.start_date, event.end_date)}</p>
          {event.location && (
            <p className="flex items-center gap-1.5">
              <MapPinIcon size={15} aria-hidden="true" />
              {event.location}
            </p>
          )}
        </div>

        <div className="mt-auto pt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Meta event={event} />
            {role && <span className="text-[13px] font-medium text-accent-ink">{ROLE_LABELS[role]}</span>}
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-fg group-hover:gap-3 transition-all">
            Ouvrir la fiche
            <ArrowRightIcon size={16} aria-hidden="true" />
          </span>
        </div>
      </div>
    </button>
  )
}
