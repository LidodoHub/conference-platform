const STEPS = [
  { label: 'Phase scientifique', hint: 'Dépôt, reviews, décisions' },
  { label: 'Phase organisationnelle', hint: 'Inscriptions, programme, présences' },
]

export default function PhaseStepper({ phase }) {
  const current = phase === 'organizational' ? 1 : 0

  return (
    <ol className="flex flex-col sm:flex-row gap-4 sm:gap-10 mt-8 pt-6 border-t border-white/15">
      {STEPS.map((step, i) => {
        const reached = i <= current
        return (
          <li key={step.label} className="flex items-start gap-3 flex-1 min-w-0">
            <span
              className="mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono shrink-0"
              style={
                reached
                  ? { background: '#C8963E', color: '#1B2A4A' }
                  : { background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }
              }
            >
              {i < current ? '✓' : i + 1}
            </span>
            <div className="min-w-0">
              <p className={`text-sm ${reached ? 'font-medium text-white' : 'text-white/50'}`}>{step.label}</p>
              <p className={`text-xs ${reached ? 'text-white/60' : 'text-white/40'}`}>{step.hint}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}