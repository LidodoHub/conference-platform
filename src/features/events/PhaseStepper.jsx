import { CheckIcon, InfoIcon } from '@phosphor-icons/react'

const STEPS = [
  {
    label: '1. Phase scientifique',
    short: 'Scientifique',
    hint: 'Dépôts d’articles, relectures et décisions',
    descNow: 'Appel à communication ouvert aux chercheurs',
    descDone: 'Évaluations terminées et clôturées',
  },
  {
    label: '2. Phase organisationnelle',
    short: 'Organisation',
    hint: 'Inscriptions, programme et badges',
    descNow: 'Inscriptions ouvertes et planning des sessions',
    descFuture: 'S’ouvre après la clôture des évaluations',
  },
]

export default function PhaseStepper({ phase }) {
  const current = phase === 'organizational' ? 1 : 0

  return (
    <div className="space-y-2">
      <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3" aria-label="Avancement de l'événement">
        {STEPS.map((step, i) => {
          const done = i < current
          const now = i === current
          return (
            <li
              key={step.label}
              aria-current={now ? 'step' : undefined}
              className={`relative flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 border transition-colors ${
                now
                  ? 'border-accent/60 bg-accent/10 shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent)_20%,transparent)]'
                  : done
                    ? 'border-ok/30 bg-ok/5'
                    : 'border-line bg-surface/40 opacity-75'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`inline-flex w-7 h-7 items-center justify-center rounded-lg text-xs font-semibold shrink-0 ${
                    now
                      ? 'bg-accent text-on-accent shadow-sm'
                      : done
                        ? 'bg-ok/20 text-ok font-bold'
                        : 'bg-fg/8 text-muted'
                  }`}
                >
                  {done ? <CheckIcon size={14} weight="bold" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <span className={`block text-sm leading-tight ${now ? 'font-semibold text-fg' : 'text-fg/80'}`}>
                    <span className="sm:hidden">{step.short}</span>
                    <span className="hidden sm:inline">{step.label}</span>
                  </span>
                  <span className="block text-xs text-muted truncate mt-0.5">
                    {now ? step.descNow : done ? step.descDone : step.descFuture}
                  </span>
                </div>
              </div>

              <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full">
                {now ? (
                  <span className="inline-flex items-center gap-1 text-accent-ink bg-accent/20 px-2 py-0.5 rounded-full font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    En cours
                  </span>
                ) : done ? (
                  <span className="text-ok bg-ok/15 px-2 py-0.5 rounded-full font-medium">Terminée</span>
                ) : (
                  <span className="text-muted bg-fg/6 px-2 py-0.5 rounded-full">À venir</span>
                )}
              </span>
            </li>
          )
        })}
      </ol>

      <p className="text-xs text-muted flex items-center gap-1.5 px-1">
        <InfoIcon size={14} className="text-accent-ink shrink-0" aria-hidden="true" />
        {phase === 'scientific' ? (
          <span>
            <strong>Étape actuelle :</strong> Dépôt d’articles et évaluations par le comité. Les inscriptions des participants et le planning des sessions s’ouvriront en phase organisationnelle.
          </span>
        ) : (
          <span>
            <strong>Étape actuelle :</strong> La phase scientifique est close. Les auteurs acceptés peuvent régler leurs frais et les sessions sont programmées en salle.
          </span>
        )}
      </p>
    </div>
  )
}
