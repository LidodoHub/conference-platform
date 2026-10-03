export default function Tabs({ tabs, active, onChange, variant = 'main' }) {
  const main = variant === 'main'

  return (
    <div
      role="tablist"
      className={`tabs-scroll flex overflow-x-auto ${main ? 'gap-1 border-b border-taupe/30' : 'gap-2 pb-1'}`}
    >
      {tabs.map((t) => {
        const isActive = t.id === active

        const base = main
          ? 'shrink-0 px-4 py-3 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors min-h-[44px]'
          : 'shrink-0 px-3.5 py-2 text-xs rounded-full border whitespace-nowrap transition-colors min-h-[40px]'

        let state
        if (main) {
          state = isActive
            ? 'border-transparent text-ink font-medium'
            : 'border-transparent text-taupe hover:text-ink'
        } else {
          state = isActive
            ? 'bg-ink text-white border-transparent'
            : 'border-taupe/30 text-taupe hover:text-ink'
        }

        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={`${base} ${state}`}
            style={main && isActive ? { borderBottomColor: 'var(--color-gold)' } : undefined}
          >
            {t.label}
            {t.badge ? (
              <span className={`ml-2 font-mono text-xs ${!main && isActive ? 'text-white/80' : 'text-taupe'}`}>
                {t.badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}