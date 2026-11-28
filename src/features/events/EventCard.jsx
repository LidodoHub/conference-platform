import { MapPinIcon, ArrowUpRightIcon, ArrowRightIcon, CalendarBlankIcon } from '@phosphor-icons/react'
import EventCover from '../../components/ui/EventCover'
import { cleanDescription } from '../../lib/cover'
import { TYPE_LABELS, STATUS_LABELS, STATUS_BADGE, FORMAT_LABELS, ROLE_LABELS, PHASE_LABELS, formatDateRange } from '../../lib/constants'
import { useLanguage } from '../../context/LanguageContext'

const dayParts = (d, locale = 'fr-FR') => {
  if (!d) return null
  const date = new Date(`${String(d).slice(0, 10)}T00:00:00`)
  return {
    day: date.getDate(),
    month: date.toLocaleDateString(locale, { month: 'short' }),
    year: date.getFullYear(),
  }
}

const countdownBadge = (ev, t) => {
  if (!ev.start_date) return null
  const today = new Date().toISOString().slice(0, 10)
  if (ev.start_date <= today && today <= (ev.end_date || ev.start_date)) {
    return { label: t('dashboard.statusOngoing'), dot: 'bg-emerald-400', cls: 'backdrop-blur-md bg-black/50 text-white border border-white/15 font-medium' }
  }
  const diffDays = Math.round((new Date(`${ev.start_date}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000)
  if (diffDays < 0) return { label: t('dashboard.statusClosed'), dot: 'bg-neutral-400', cls: 'backdrop-blur-md bg-black/50 text-white/80 border border-white/15 font-medium' }
  if (diffDays === 1) return { label: t('eventCard.tomorrow'), dot: 'bg-accent', cls: 'backdrop-blur-md bg-black/50 text-white border border-white/15 font-medium' }
  if (diffDays <= 7) return { label: t('eventCard.daysLeft', { n: diffDays }), dot: 'bg-red-400', cls: 'backdrop-blur-md bg-black/50 text-white border border-white/15 font-medium' }
  return { label: t('eventCard.inDays', { n: diffDays }), dot: 'bg-neutral-300', cls: 'backdrop-blur-md bg-black/50 text-white border border-white/15 font-medium' }
}

function CoverDate({ date, large = false, label }) {
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
          {label}
        </span>
      </div>
    </div>
  )
}

function Meta({ event, t }) {
  const statusKey = `eventCard.statuses.${event.status}`
  const statusTxt = t(statusKey)
  const statusLabel = statusTxt !== statusKey ? statusTxt : (STATUS_LABELS[event.status] || event.status)

  const phaseKey = `eventCard.phases.${event.phase}`
  const phaseTxt = t(phaseKey)
  const phaseLabel = phaseTxt !== phaseKey ? phaseTxt : PHASE_LABELS[event.phase]

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`w-fit self-start shrink-0 ${STATUS_BADGE[event.status] || 'badge-draft'}`}>{statusLabel}</span>
      {['published', 'ongoing'].includes(event.status) && event.phase && (
        <span className="badge-type w-fit self-start shrink-0">{phaseLabel}</span>
      )}
    </div>
  )
}

// Carte d'événement avec cartel-date académique et décompte temporel.
export default function EventCard({ event, role, onOpen, style }) {
  const { locale, t } = useLanguage()
  const when = dayParts(event.start_date, locale)
  const timer = countdownBadge(event, t)
  const rawTopics = event.tracks || event.themes || event.tags
  const topics = Array.isArray(rawTopics)
    ? rawTopics.filter(Boolean).slice(0, 3)
    : typeof rawTopics === 'string'
      ? rawTopics.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 3)
      : []

  const typeKey = `eventCard.types.${event.type}`
  const typeTxt = t(typeKey)
  const typeLabel = typeTxt !== typeKey ? typeTxt : (TYPE_LABELS[event.type] || event.type)

  const formatKey = `eventCard.formats.${event.format}`
  const formatTxt = t(formatKey)
  const formatLabel = formatTxt !== formatKey ? formatTxt : (FORMAT_LABELS[event.format] || '')

  const roleKey = `roles.${role}`
  const roleTxt = t(roleKey)
  const roleLabel = roleTxt !== roleKey ? roleTxt : ROLE_LABELS[role]

  return (
    <button
      type="button"
      onClick={() => onOpen(event.id)}
      className="group card event-card-shadow h-full text-start flex flex-col rounded-xl border border-line bg-surface shadow-card hover:shadow-lift hover:border-black/15 dark:hover:border-white/[0.14] transition-all duration-200 active:translate-y-0 active:scale-[0.985] cursor-pointer"
      style={style}
    >
      <div className="p-2.5 pb-0 w-full">
        <EventCover
          seed={event.id}
          event={event}
          className="aspect-[16/10] w-full p-3.5 sm:p-4 rounded-lg ring-1 ring-inset ring-black/5 dark:ring-white/10 flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 relative z-10">
            <span className="backdrop-blur-md bg-black/50 text-white border border-white/15 text-[11px] font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 w-fit shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
              <span>
                {typeLabel}
                {event.format && event.format !== 'onsite' && ` • ${formatLabel.toLowerCase()}`}
              </span>
            </span>
            {timer && (
              <span className="backdrop-blur-md bg-black/50 text-white border border-white/15 text-[11px] font-medium px-2.5 py-1 rounded-full w-fit shrink-0">
                {timer.label}
              </span>
            )}
          </div>

          <div className="relative z-10">
            <CoverDate date={when} label={t('eventCard.officialCalendar')} />
          </div>

          <span
            className="absolute end-3.5 bottom-3.5 inline-flex w-8 h-8 items-center justify-center rounded-full bg-black/45 text-white border border-white/15 backdrop-blur-md opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-200 z-10"
            aria-hidden="true"
          >
            <ArrowUpRightIcon size={15} weight="bold" className="rtl:-scale-x-100" />
          </span>
        </EventCover>
      </div>

      <div className="flex-1 flex flex-col p-5 pt-4 w-full">
        <div className="mb-4">
          <Meta event={event} t={t} />
          <h3 className="mt-2.5 text-[16px] font-semibold tracking-[-0.01em] leading-snug text-fg line-clamp-2" style={{ overflowWrap: 'anywhere' }}>
            {event.title}
          </h3>
          {event.description && (
            <p className="text-[13.5px] leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1.5">
              {cleanDescription(event.description)}
            </p>
          )}

          {topics.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {topics.map((topic) => (
                <span
                  key={topic}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 dark:bg-white/5 dark:text-neutral-300"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto pt-3.5 border-t border-neutral-100 dark:border-white/8 flex items-center justify-between gap-2 text-[12px] text-neutral-500 dark:text-neutral-400">
          <span className="min-w-0 inline-flex items-center gap-1.5 truncate">
            <MapPinIcon className="w-3.5 h-3.5 shrink-0" weight="regular" aria-hidden="true" />
            <span className="truncate">{event.location || t('dashboard.defaultLocation')}</span>
          </span>
          {role ? (
            <span className="shrink-0 font-medium text-fg">{roleLabel}</span>
          ) : (
            <span className="text-accent-ink text-[12px] font-medium shrink-0 inline-flex items-center gap-1">
              <span>{t('dashboard.actionView')}</span>
              <ArrowRightIcon className="w-3.5 h-3.5 rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" weight="bold" aria-hidden="true" />
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// Événement à la une : grande carte horizontale.
export function FeaturedEventCard({ event, role, onOpen }) {
  const { locale, t } = useLanguage()
  const when = dayParts(event.start_date, locale)
  const timer = countdownBadge(event, t)

  const typeKey = `eventCard.types.${event.type}`
  const typeTxt = t(typeKey)
  const typeLabel = typeTxt !== typeKey ? typeTxt : (TYPE_LABELS[event.type] || event.type)

  const formatKey = `eventCard.formats.${event.format}`
  const formatTxt = t(formatKey)
  const formatLabel = formatTxt !== formatKey ? formatTxt : (FORMAT_LABELS[event.format] || '')

  const roleKey = `roles.${role}`
  const roleTxt = t(roleKey)
  const roleLabel = roleTxt !== roleKey ? roleTxt : ROLE_LABELS[role]

  return (
    <button
      type="button"
      onClick={() => onOpen(event.id)}
      className="group card event-card-shadow overflow-hidden text-start w-full grid grid-cols-1 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] rounded-xl border border-line bg-surface hover:border-black/15 dark:hover:border-white/[0.14] transition-all duration-200 active:scale-[0.99] cursor-pointer"
    >
      <EventCover seed={event.id} event={event} className="min-h-48 md:min-h-80 p-5 sm:p-8 flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 relative z-10">
          <span className="text-sm font-medium text-fg dark:text-white/90 px-3 py-1 rounded-full bg-surface/90 dark:bg-[#222226] border border-line/50 backdrop-blur-xs w-fit self-start shrink-0">
            {typeLabel} • {formatLabel.toLowerCase()}
          </span>
          {timer && (
            <span className={`text-xs uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs w-fit self-start shrink-0 ${timer.cls}`}>
              {timer.label}
            </span>
          )}
        </div>
        <div className="relative z-10">
          <CoverDate date={when} large label={t('eventCard.officialCalendar')} />
        </div>
      </EventCover>

      <div className="p-5 sm:p-8 flex flex-col justify-between">
        <div>
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">
            {t('eventCard.featuredUniversity')}
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
            <Meta event={event} t={t} />
            {role && <span className="text-xs font-semibold text-muted">{roleLabel}</span>}
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg dark:text-white group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
            {t('eventCard.openConference')}
            <ArrowRightIcon size={14} weight="bold" className="rtl:rotate-180" aria-hidden="true" />
          </span>
        </div>
      </div>
    </button>
  )
}
