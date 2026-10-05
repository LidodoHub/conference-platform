import { useState } from 'react'
import { SunIcon, MoonIcon, CircleHalfIcon } from '@phosphor-icons/react'
import { applyTheme, readThemePref } from '../../lib/theme'

const ORDER = ['system', 'light', 'dark']
const META = {
  system: { icon: CircleHalfIcon, label: 'Thème : système' },
  light: { icon: SunIcon, label: 'Thème : clair' },
  dark: { icon: MoonIcon, label: 'Thème : sombre' },
}

// Bascule système → clair → sombre.
export default function ThemeToggle({ className = '' }) {
  const [pref, setPref] = useState(readThemePref)
  const { icon: Icon, label } = META[pref]

  const next = () => {
    const value = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length]
    applyTheme(value)
    setPref(value)
  }

  return (
    <button type="button" onClick={next} className={className} aria-label={label} title={label}>
      <Icon size={18} aria-hidden="true" />
    </button>
  )
}
