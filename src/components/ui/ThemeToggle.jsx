import { useState } from 'react'
import { SunIcon, MoonIcon } from '@phosphor-icons/react'
import { applyTheme, readThemePref } from '../../lib/theme'
import { useLanguage } from '../../context/LanguageContext'

const OPTIONS = [
  { id: 'light', key: 'theme.light', icon: SunIcon },
  { id: 'dark', key: 'theme.dark', icon: MoonIcon },
]

function resolveInitialTheme() {
  const pref = readThemePref()
  if (pref === 'light' || pref === 'dark') return pref
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme')
    if (attr === 'dark' || attr === 'light') return attr
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeToggle({ className = '' }) {
  const { t } = useLanguage()
  const [theme, setTheme] = useState(resolveInitialTheme)

  const choose = (id) => {
    applyTheme(id)
    setTheme(id)
  }

  return (
    <div
      dir="ltr"
      role="group"
      aria-label={t('theme.label')}
      className={`group inline-flex items-center rounded-full border border-neutral-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 p-0.5 text-[11.5px] font-medium ${className}`}
    >
      {OPTIONS.map(({ id, key, icon: OptIcon }) => {
        const active = id === theme
        const label = t(key)
        return (
          <button
            key={id}
            type="button"
            onClick={() => choose(id)}
            aria-pressed={active}
            aria-label={label}
            title={label}
            className={
              active
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-full p-1 group-hover:px-2.5 group-hover:py-0.5 transition-all duration-200 cursor-pointer shrink-0 inline-flex items-center justify-center whitespace-nowrap'
                : 'max-w-0 overflow-hidden opacity-0 p-0 pointer-events-none group-hover:max-w-[6.5rem] group-hover:opacity-100 group-hover:px-2.5 group-hover:py-0.5 group-hover:pointer-events-auto text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-all duration-200 cursor-pointer shrink-0 inline-flex items-center justify-center gap-1.5 whitespace-nowrap'
            }
          >
            <OptIcon size={14} weight={active ? 'fill' : 'regular'} className="shrink-0" aria-hidden="true" />
            {active ? (
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[4.5rem] group-hover:opacity-100 group-hover:ms-1.5 transition-all duration-200">
                {label}
              </span>
            ) : (
              <span>{label}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
