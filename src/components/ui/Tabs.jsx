// Onglets accessibles (flèches gauche/droite). variant="main" : soulignés ; variant="pill" : segments.
export default function Tabs({ tabs, active, onChange, variant = 'main', label }) {
  const main = variant === 'main'

  const onKeyDown = (e) => {
    const i = tabs.findIndex((t) => t.id === active)
    let next = null
    if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length]
    if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length]
    if (next) {
      e.preventDefault()
      onChange(next.id)
      e.currentTarget.querySelector(`[data-tab="${next.id}"]`)?.focus()
    }
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`tabs-scroll flex overflow-x-auto ${
        main ? 'gap-1 border-b border-line' : 'gap-1 p-1 rounded-xl bg-surface-2 border border-line w-fit max-w-full'
      }`}
    >
      {tabs.map((t) => {
        const isActive = t.id === active
        const Icon = t.icon
        const base = main
          ? 'relative shrink-0 inline-flex items-center gap-2 px-3.5 py-3 text-sm whitespace-nowrap transition-colors min-h-11'
          : 'shrink-0 inline-flex items-center gap-2 px-3.5 py-2 text-[13px] rounded-lg whitespace-nowrap transition-colors min-h-9'
        let state
        if (main) state = isActive ? 'text-fg font-medium' : 'text-muted hover:text-fg'
        else
          state = isActive
            ? 'bg-surface text-fg font-medium shadow-[0_1px_2px_rgb(22_35_63/0.12)]'
            : 'text-muted hover:text-fg'

        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            data-tab={t.id}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={`${base} ${state}`}
          >
            {Icon && <Icon size={16} weight={isActive ? 'fill' : 'regular'} aria-hidden="true" />}
            {t.label}
            {t.badge ? (
              <span
                className={`num font-mono text-[11px] rounded-full px-1.5 min-w-5 text-center ${
                  isActive ? 'bg-accent text-on-accent' : 'bg-fg/8 text-muted'
                }`}
              >
                {t.badge}
              </span>
            ) : null}
            {main && isActive && (
              <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-accent" aria-hidden="true" />
            )}
          </button>
        )
      })}
    </div>
  )
}
