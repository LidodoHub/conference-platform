// Pastille de statut. `color` accepte un hex ou une variable CSS (var(--color-st-ok)).
export default function Pill({ color = 'var(--color-st-muted)', dot = true, mono = false, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 whitespace-nowrap ${
        mono ? 'font-mono text-[11px] uppercase tracking-wider' : 'text-xs font-medium'
      }`}
      style={{
        color,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
      }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />}
      {children}
    </span>
  )
}
