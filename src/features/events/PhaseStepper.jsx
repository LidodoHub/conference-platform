import { CheckIcon, InfoIcon } from '@phosphor-icons/react'
import { useLanguage } from '../../context/LanguageContext'

const STEPS_BY_LANG = {
  fr: [
    {
      label: '1. Phase scientifique',
      short: 'Scientifique',
      descNow: 'Appel à communication ouvert aux chercheurs',
      descDone: 'Évaluations terminées et clôturées',
    },
    {
      label: '2. Phase organisationnelle',
      short: 'Organisation',
      descNow: 'Inscriptions ouvertes et planning des sessions',
      descFuture: 'S’ouvre après la clôture des évaluations',
    },
  ],
  en: [
    {
      label: '1. Scientific phase',
      short: 'Scientific',
      descNow: 'Call for papers open to researchers',
      descDone: 'Reviews completed and closed',
    },
    {
      label: '2. Organizational phase',
      short: 'Organization',
      descNow: 'Registrations open and session schedule active',
      descFuture: 'Opens after reviews are closed',
    },
  ],
  ar: [
    {
      label: '1. المرحلة العلمية',
      short: 'العلمية',
      descNow: 'الدعوة لتقديم الأوراق البحثية مفتوحة للباحثين',
      descDone: 'تمت التقييمات وأُغلقت المرحلة',
    },
    {
      label: '2. المرحلة التنظيمية',
      short: 'التنظيم',
      descNow: 'التسجيلات مفتوحة وبرمجة الجلسات نشطة',
      descFuture: 'تُفتح بعد إغلاق التقييمات',
    },
  ],
}

export default function PhaseStepper({ phase }) {
  const { t, lang } = useLanguage()
  const current = phase === 'organizational' ? 1 : 0
  const steps = STEPS_BY_LANG[lang] || STEPS_BY_LANG.fr

  return (
    <div className="space-y-2">
      <ol
        className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3"
        aria-label={lang === 'ar' ? 'تقدم التظاهرة' : lang === 'en' ? 'Event progress' : "Avancement de l'événement"}
      >
        {steps.map((step, i) => {
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

              <span className="shrink-0 inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-0.5 rounded-full bg-white text-neutral-800 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10">
                {now ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
                    <span>{t('event.ongoingPhase')}</span>
                  </>
                ) : done ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                    <span>{t('event.finishedPhase')}</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" aria-hidden="true" />
                    <span>{t('event.upcoming')}</span>
                  </>
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
            <strong>
              {lang === 'ar' ? 'المرحلة الحالية:' : lang === 'en' ? 'Current step:' : 'Étape actuelle :'}
            </strong>{' '}
            {lang === 'ar'
              ? 'إيداع الأوراق البحثية وتقييمها من طرف اللجنة العلمية. تُفتح تسجيلات المشاركين وبرمجة الجلسات في المرحلة التنظيمية.'
              : lang === 'en'
                ? 'Paper submissions and committee reviews. Participant registrations and session scheduling will open in the organizational phase.'
                : 'Dépôt d’articles et évaluations par le comité. Les inscriptions des participants et le planning des sessions s’ouvriront en phase organisationnelle.'}
          </span>
        ) : (
          <span>
            <strong>
              {lang === 'ar' ? 'المرحلة الحالية:' : lang === 'en' ? 'Current step:' : 'Étape actuelle :'}
            </strong>{' '}
            {lang === 'ar'
              ? 'أُغلقت المرحلة العلمية. يمكن للمؤلفين المقبولين تسديد الرسوم وتمت برمجة الجلسات في القاعات.'
              : lang === 'en'
                ? 'The scientific phase is closed. Accepted authors can pay their fees and sessions are scheduled in rooms.'
                : 'La phase scientifique est close. Les auteurs acceptés peuvent régler leurs frais et les sessions sont programmées en salle.'}
          </span>
        )}
      </p>
    </div>
  )
}
