// Monogramme CONFERA : un "C" dans un badge doré, rappel du badge de conférence.
export default function Logo({ compact = false, inverted = true }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-[9px] bg-accent text-on-accent font-bold text-[15px] shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)]">
        C
      </span>
      {!compact && (
        <span className={`font-semibold tracking-tight text-[17px] ${inverted ? 'text-white' : 'text-fg'}`}>
          CONFERA
        </span>
      )}
    </span>
  )
}
