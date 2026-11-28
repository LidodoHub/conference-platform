import { useState, useRef, useEffect } from 'react'
import { CalendarPlusIcon, GoogleLogoIcon, CalendarBlankIcon, CaretDownIcon } from '@phosphor-icons/react'
import { downloadICS, googleCalendarUrl } from '../../lib/calendar'
import { useLanguage } from '../../context/LanguageContext'

export default function AddToCalendarButton({
  event,
  title,
  description,
  location,
  start,
  end,
  btnClass = 'btn-outline btn-sm',
  label = 'Ajouter au calendrier',
}) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const timeoutRef = useRef(null)

  const evTitle = title || event?.title || 'Conférence USTO'
  const evDesc = description || event?.description || ''
  const evLoc = location || event?.location || 'Campus USTO-MB, Oran'
  const evStart = start || event?.start_date
  const evEnd = end || event?.end_date || evStart

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpen(true)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setOpen(false)
    }, 280)
  }

  const onDownloadICS = () => {
    downloadICS({
      title: evTitle,
      description: evDesc,
      location: evLoc,
      start: evStart,
      end: evEnd,
      filename: `confera-${evTitle.slice(0, 25)}.ics`,
    })
    setOpen(false)
  }

  const gcalHref = googleCalendarUrl({
    title: evTitle,
    description: evDesc,
    location: evLoc,
    start: evStart,
    end: evEnd,
  })

  return (
    <div
      className="relative inline-block text-start"
      ref={menuRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${btnClass} inline-flex items-center gap-1.5 transition-all duration-150 active:scale-95`}
        aria-expanded={open}
        aria-haspopup="true"
        title={label}
      >
        <CalendarPlusIcon size={15} weight="bold" aria-hidden="true" />
        <span>{label}</span>
        <CaretDownIcon size={12} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 mt-1.5 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-[var(--shadow-lift)] z-50 animate-modal-enter origin-top-end"
        >
          <div className="px-2 py-1 text-[11px] font-semibold text-muted uppercase tracking-wider border-b border-line/60 mb-1 flex items-center justify-between">
            <span>{t('modals.exportCalendar')}</span>
            <span className="text-[10px] lowercase text-muted font-normal">{t('modals.chooseFormat')}</span>
          </div>
          <a
            role="menuitem"
            href={gcalHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-fg hover:bg-fg/5 hover:text-fg dark:hover:text-white rounded-lg transition-all duration-150"
          >
            <GoogleLogoIcon size={16} className="text-muted shrink-0" weight="bold" />
            <span>Google Calendar</span>
          </a>

          <button
            type="button"
            role="menuitem"
            onClick={onDownloadICS}
            className="w-full text-start flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-fg hover:bg-fg/5 hover:text-fg dark:hover:text-white rounded-lg transition-all duration-150 cursor-pointer"
          >
            <CalendarBlankIcon size={16} className="text-muted shrink-0" weight="bold" />
            <span>Fichier iCalendar (.ics)</span>
          </button>
        </div>
      )}
    </div>
  )
}
