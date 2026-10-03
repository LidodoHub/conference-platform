const STEPS = [
  { label: 'Phase scientifique', hint: 'Dépôt, reviews, décisions' },
  { label: 'Phase organisationnelle', hint: 'Inscriptions, programme, présences' },
]

export default function PhaseStepper({ phase }) {
  const current = phase === 'organizational' ? 1 : 0

  return (
    <ol className="flex flex-col sm:flex-row gap-3 sm:gap-8 mt-6 pt-5 border-t border-dashed border-taupe/30">
      {STEPS.map((step, i) => {
        const reached = i <= current
        return (
          <li key={step.label} className="flex items-start gap-3 flex-1 min-w-0">
            <span
              className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono shrink-0"
              style={
                reached
                  ? { background: '#c9a24a', color: '#ffffff' }
                  : { background: '#ebe8df', color: '#8a8577' }
              }
            >
              {i < current ? '✓' : i + 1}
            </span>
            <div className="min-w-0">
              <p className={`text-sm ${reached ? 'font-medium text-ink' : 'text-taupe'}`}>{step.label}</p>
              <p className="text-xs text-taupe">{step.hint}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}