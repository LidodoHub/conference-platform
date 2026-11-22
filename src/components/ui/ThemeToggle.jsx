import { useState, useEffect, useRef } from 'react'
import { SunIcon, MoonIcon, CircleHalfIcon, CheckIcon } from '@phosphor-icons/react'
import { applyTheme, readThemePref } from '../../lib/theme'

const OPTIONS = [
  { id: 'system', label: 'Système', icon: CircleHalfIcon },
  { id: 'light', label: 'Clair', icon: SunIcon },
  { id: 'dark', label: 'Sombre', icon: MoonIcon },
]

export default function ThemeToggle({ className = '' }) {
  const [pref, setPref] = useState(readThemePref)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const timeoutRef = useRef(null)
  const current = OPTIONS.find((o) => o.id === pref) || OPTIONS[0]
  const Icon = current.icon

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
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

  const choose = (id) => {
    applyTheme(id)
    setPref(id)
    setOpen(false)
  }

  return (
    <div
      className="relative inline-flex items-center"
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${className} transition-transform duration-150 active:scale-95`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Thème : ${current.label.toLowerCase()}`}
        title={`Thème : ${current.label.toLowerCase()}`}
      >
        <Icon size={18} aria-hidden="true" className="transition-transform duration-300 hover:rotate-12" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Thème"
          className="absolute right-0 top-11 z-50 w-38 card p-1 shadow-[var(--shadow-lift)] border border-line bg-surface/98 backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-150 origin-top-right space-y-0.5"
        >
          {OPTIONS.map(({ id, label, icon: OptIcon }) => {
            const active = id === pref
            return (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(id)}
                className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-all duration-150 cursor-pointer active:scale-95 ${
                  active
                    ? 'bg-black/[0.06] dark:bg-white/10 text-fg dark:text-white font-semibold shadow-xs'
                    : 'text-muted hover:text-fg hover:bg-fg/5'
                }`}
              >
                <OptIcon size={16} aria-hidden="true" className={active ? 'text-fg dark:text-white' : ''} />
                <span className="flex-1 text-left">{label}</span>
                {active && <CheckIcon size={14} weight="bold" className="text-fg dark:text-white animate-in zoom-in-75 duration-150" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
