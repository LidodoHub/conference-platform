import { useState, useEffect, useRef } from 'react'
import { SunIcon, MoonIcon, CircleHalfIcon, CheckIcon } from '@phosphor-icons/react'
import { applyTheme, readThemePref } from '../../lib/theme'

const OPTIONS = [
  { id: 'system', label: 'Système', icon: CircleHalfIcon },
  { id: 'light', label: 'Clair', icon: SunIcon },
  { id: 'dark', label: 'Sombre', icon: MoonIcon },
]

// Choix du thème dans un petit menu : un clic pour ouvrir, un clic pour choisir.
export default function ThemeToggle({ className = '' }) {
  const [pref, setPref] = useState(readThemePref)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
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

  const choose = (id) => {
    applyTheme(id)
    setPref(id)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={className}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Thème : ${current.label.toLowerCase()}`}
        title={`Thème : ${current.label.toLowerCase()}`}
      >
        <Icon size={18} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Thème"
          className="absolute right-0 top-12 z-50 w-44 card p-1.5 shadow-[var(--shadow-lift)] rise"
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
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? 'bg-accent/12 text-fg font-medium' : 'text-muted hover:text-fg hover:bg-fg/5'
                }`}
              >
                <OptIcon size={17} aria-hidden="true" className={active ? 'text-accent-ink' : ''} />
                <span className="flex-1 text-left">{label}</span>
                {active && <CheckIcon size={15} weight="bold" className="text-accent-ink" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
