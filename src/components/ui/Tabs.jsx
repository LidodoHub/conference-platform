export default function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-ink/10 mb-6">
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`px-3 sm:px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              active
                ? 'text-ink border-b-2 border-gold -mb-px'
                : 'text-taupe hover:text-ink'
            }`}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span className="font-mono text-[10px] text-taupe ml-2">{tab.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
