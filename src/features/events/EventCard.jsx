import { MapPinIcon, CaretRightIcon } from '@phosphor-icons/react'
import { TYPE_LABELS, STATUS_LABELS, STATUS_BADGE, FORMAT_LABELS, ROLE_LABELS, formatDateRange } from '../../lib/constants'

const dayParts = (d) => {
  if (!d) return null
  const date = new Date(`${String(d).slice(0, 10)}T00:00:00`)
  return {
    day: date.getDate(),
    month: date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
    year: date.getFullYear(),
  }
}

// Carte "billet" d'un événement. C'est un vrai bouton : utilisable au clavier.
export default function EventCard({ event, role, onOpen, style }) {
  const when = dayParts(event.start_date)

  return (
    <button
      type="button"
      onClick={() => onOpen(event.id)}
      className="card-ticket group w-full text-left rise"
      style={style}
    >
      <div className="ticket-stripe" />
      <div className="flex flex-col items-center justify-center w-[76px] shrink-0 py-4 bg-surface-2/60">
        {when ? (
          <>
            <span className="text-[11px] uppercase tracking-wider text-accent-ink font-medium">{when.month}</span>
            <span className="num text-3xl font-semibold tracking-tight text-fg leading-none mt-1">{when.day}</span>
            <span className="num text-[11px] text-faint mt-1">{when.year}</span>
          </>
        ) : (
          <span className="text-xs text-faint">Date ?</span>
        )}
      </div>
      <div className="ticket-perforation" />

      <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={STATUS_BADGE[event.status] || 'badge-draft'}>{STATUS_LABELS[event.status] || event.status}</span>
          <span className="badge-type">{TYPE_LABELS[event.type] || event.type}</span>
          {event.format && event.format !== 'onsite' && (
            <span className="badge-type">{FORMAT_LABELS[event.format]}</span>
          )}
        </div>

        <h3
          className="mt-3 font-semibold text-[17px] leading-snug tracking-tight text-fg group-hover:text-accent-ink transition-colors"
          style={{ overflowWrap: 'anywhere' }}
        >
          {event.title}
        </h3>

        {event.description && (
          <p className="text-sm text-muted leading-relaxed line-clamp-2 mt-1.5">{event.description}</p>
        )}

        <div className="mt-auto pt-4 flex items-end justify-between gap-3">
          <div className="min-w-0 text-[13px] text-muted space-y-0.5">
            <p className="num">{formatDateRange(event.start_date, event.end_date)}</p>
            {event.location && (
              <p className="flex items-center gap-1.5 truncate">
                <MapPinIcon size={14} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{event.location}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {role && (
              <span className="text-xs font-medium rounded-full px-2.5 py-0.5 bg-accent/15 text-accent-ink">
                {ROLE_LABELS[role]}
              </span>
            )}
            <CaretRightIcon
              size={16}
              className="text-faint group-hover:text-fg group-hover:translate-x-0.5 transition-transform"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </button>
  )
}
