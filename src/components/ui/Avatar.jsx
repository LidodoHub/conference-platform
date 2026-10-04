export default function Avatar({ name, size = 36, tone = 'gold' }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'
  const tones = {
    gold: { background: '#C8963E', color: '#1B2A4A' },
    light: { background: 'rgba(255,255,255,0.14)', color: '#FFFFFF' },
  }

  return (
    <span
      className="rounded-full flex items-center justify-center font-display font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42, ...tones[tone] }}
      aria-hidden="true"
    >
      {initial}
    </span>
  )
}