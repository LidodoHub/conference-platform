// Chiffre clé : libellé, valeur en grand, détail facultatif.
export default function Stat({ label, value, detail, tone }) {
  return (
    <div className="card px-4 py-4 sm:px-5">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="num mt-1 text-3xl font-semibold tracking-tight text-fg" style={tone ? { color: tone } : undefined}>
        {value}
      </p>
      {detail && <p className="text-xs text-faint mt-1">{detail}</p>}
    </div>
  )
}
