import { CheckIcon } from '@phosphor-icons/react'

const STEPS = [
  { label: 'Phase scientifique', hint: 'Dépôts, reviews, décisions' },
  { label: 'Phase organisationnelle', hint: 'Inscriptions, programme, présences' },
]

export default function PhaseStepper({ phase }) {
  const current = phase === 'organizational' ? 1 : 0

  return (
    <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Avancement de l'événement">
      {STEPS.map((step, i) => {
        const done = i < current
        const now = i === current
        return (
          <li
            key={step.label}
            aria-current={now ? 'step' : undefined}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-3 border ${
              now ? 'border-accent/50 bg-accent/10' : 'border-line'
            }`}
          >
            <span
              className={`inline-flex w-7 h-7 items-center justify-center rounded-lg text-xs font-semibold shrink-0 ${
                now || done ? 'bg-accent text-on-accent' : 'bg-fg/8 text-muted'
              }`}
            >
              {done ? <CheckIcon size={14} weight="bold" /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className={`block text-sm ${now ? 'font-medium text-fg' : 'text-muted'}`}>{step.label}</span>
              <span className="block text-xs text-faint">{step.hint}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
