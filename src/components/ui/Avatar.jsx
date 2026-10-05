const initialsOf = (name) => {
  const parts = (name || '?').trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] || '?').slice(0, 2)
  return letters.toUpperCase()
}

// Carré arrondi avec initiales. tone="brand" pour l'or, sinon neutre.
export default function Avatar({ name, size = 36, tone = 'neutral' }) {
  const styles = tone === 'brand' ? 'bg-accent text-on-accent' : 'bg-surface-2 text-fg border border-line'
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 font-semibold tracking-tight ${styles}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36), borderRadius: Math.round(size * 0.32) }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  )
}
