import { useState } from 'react'
import {
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  CaretRightIcon,
  ShieldCheckIcon,
  ArticleIcon,
  TicketIcon,
  LockIcon,
  SparkleIcon,
  WarningCircleIcon,
  PresentationChartIcon,
} from '@phosphor-icons/react'
import { useLanguage } from '../../context/LanguageContext'

export default function PhaseGuidanceBanner({
  event,
  canManage,
  isReviewer,
  submissions = [],
  pendingCount = 0,
  acceptedCount = 0,
  validatedCount = 0,
  paymentsToValidate = 0,
  reviewsToCount = 0,
  myPendingRevision = [],
  myAccepted = [],
  isParticipantValidated = false,
  activeTab,
  onNavigateTab,
}) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const isScientific = event.phase === 'scientific'

  // Détermination de la priorité d'action selon le rôle et la phase
  let priorityTitle
  let priorityDetail
  let actionLabel
  let targetTab
  let Icon
  let statusBadge
  let badgeTone

  if (canManage) {
    if (isScientific) {
      if (pendingCount > 0) {
        priorityTitle = t(
          pendingCount > 1 ? 'phaseGuidance.mgrSciPendingTitleMany' : 'phaseGuidance.mgrSciPendingTitleOne',
          { count: pendingCount },
        )
        priorityDetail = t('phaseGuidance.mgrSciPendingDetail')
        actionLabel = t('phaseGuidance.mgrSciPendingAction')
        targetTab = 'scientific'
        Icon = ArticleIcon
        statusBadge = t('phaseGuidance.mgrSciPendingBadge')
        badgeTone = 'accent'
      } else if (submissions.length > 0) {
        priorityTitle = t('phaseGuidance.mgrSciDoneTitle')
        priorityDetail = t(
          acceptedCount > 1 ? 'phaseGuidance.mgrSciDoneDetailMany' : 'phaseGuidance.mgrSciDoneDetailOne',
          { count: acceptedCount },
        )
        actionLabel = t('phaseGuidance.mgrSciDoneAction')
        targetTab = 'org-settings'
        Icon = CheckCircleIcon
        statusBadge = t('phaseGuidance.mgrSciDoneBadge')
        badgeTone = 'ok'
      } else {
        priorityTitle = t('phaseGuidance.mgrSciOpenTitle')
        priorityDetail = t('phaseGuidance.mgrSciOpenDetail')
        actionLabel = t('phaseGuidance.mgrSciOpenAction')
        targetTab = 'scientific'
        Icon = ClockIcon
        statusBadge = t('phaseGuidance.mgrSciOpenBadge')
        badgeTone = 'muted'
      }
    } else {
      // Phase Organisationnelle
      if (paymentsToValidate > 0) {
        priorityTitle = t(
          paymentsToValidate > 1 ? 'phaseGuidance.mgrOrgPayTitleMany' : 'phaseGuidance.mgrOrgPayTitleOne',
          { count: paymentsToValidate },
        )
        priorityDetail = t('phaseGuidance.mgrOrgPayDetail')
        actionLabel = t('phaseGuidance.mgrOrgPayAction')
        targetTab = 'org-registrations'
        Icon = TicketIcon
        statusBadge = t('phaseGuidance.mgrOrgPayBadge')
        badgeTone = 'warn'
      } else {
        priorityTitle = t('phaseGuidance.mgrOrgReadyTitle')
        priorityDetail = t(
          validatedCount > 1 ? 'phaseGuidance.mgrOrgReadyDetailMany' : 'phaseGuidance.mgrOrgReadyDetailOne',
          { count: validatedCount },
        )
        actionLabel = t('phaseGuidance.mgrOrgReadyAction')
        targetTab = 'program'
        Icon = PresentationChartIcon
        statusBadge = t('phaseGuidance.mgrOrgReadyBadge')
        badgeTone = 'ok'
      }
    }
  } else if (isReviewer) {
    if (isScientific) {
      if (reviewsToCount > 0) {
        priorityTitle = t(
          reviewsToCount > 1 ? 'phaseGuidance.revSciTodoTitleMany' : 'phaseGuidance.revSciTodoTitleOne',
          { count: reviewsToCount },
        )
        priorityDetail = t('phaseGuidance.revSciTodoDetail')
        actionLabel = t('phaseGuidance.revSciTodoAction')
        targetTab = 'scientific'
        Icon = ArticleIcon
        statusBadge = t('phaseGuidance.revSciTodoBadge')
        badgeTone = 'accent'
      } else {
        priorityTitle = t('phaseGuidance.revSciDoneTitle')
        priorityDetail = t('phaseGuidance.revSciDoneDetail')
        actionLabel = t('phaseGuidance.revSciDoneAction')
        targetTab = 'scientific'
        Icon = CheckCircleIcon
        statusBadge = t('phaseGuidance.revSciDoneBadge')
        badgeTone = 'ok'
      }
    } else {
      priorityTitle = t('phaseGuidance.revOrgTitle')
      priorityDetail = t('phaseGuidance.revOrgDetail')
      actionLabel = t('phaseGuidance.revOrgAction')
      targetTab = 'program'
      Icon = PresentationChartIcon
      statusBadge = t('phaseGuidance.revOrgBadge')
      badgeTone = 'muted'
    }
  } else {
    // Participant / Auteur
    if (isScientific) {
      if (myPendingRevision.length > 0) {
        priorityTitle = t('phaseGuidance.authorRevisionTitle', { title: myPendingRevision[0].title })
        priorityDetail = t('phaseGuidance.authorRevisionDetail')
        actionLabel = t('phaseGuidance.authorRevisionAction')
        targetTab = 'scientific'
        Icon = WarningCircleIcon
        statusBadge = t('phaseGuidance.authorRevisionBadge')
        badgeTone = 'warn'
      } else if (submissions.length > 0) {
        priorityTitle = t('phaseGuidance.authorSubmittedTitle')
        priorityDetail = t('phaseGuidance.authorSubmittedDetail')
        actionLabel = t('phaseGuidance.authorSubmittedAction')
        targetTab = 'scientific'
        Icon = ClockIcon
        statusBadge = t('phaseGuidance.authorSubmittedBadge')
        badgeTone = 'muted'
      } else {
        priorityTitle = t('phaseGuidance.authorOpenTitle')
        priorityDetail = t('phaseGuidance.authorOpenDetail')
        actionLabel = t('phaseGuidance.authorOpenAction')
        targetTab = 'scientific'
        Icon = SparkleIcon
        statusBadge = t('phaseGuidance.authorOpenBadge')
        badgeTone = 'accent'
      }
    } else {
      // Phase Organisationnelle
      if (myAccepted.length > 0) {
        if (isParticipantValidated) {
          priorityTitle = t('phaseGuidance.authorValidatedTitle')
          priorityDetail = t('phaseGuidance.authorValidatedDetail')
          actionLabel = t('phaseGuidance.authorValidatedAction')
          targetTab = 'overview'
          Icon = ShieldCheckIcon
          statusBadge = t('phaseGuidance.authorValidatedBadge')
          badgeTone = 'ok'
        } else {
          priorityTitle = t('phaseGuidance.authorAcceptedTitle', { title: myAccepted[0].title })
          priorityDetail = t('phaseGuidance.authorAcceptedDetail')
          actionLabel = t('phaseGuidance.authorAcceptedAction')
          targetTab = 'overview'
          Icon = TicketIcon
          statusBadge = t('phaseGuidance.authorAcceptedBadge')
          badgeTone = 'accent'
        }
      } else {
        priorityTitle = t('phaseGuidance.authorProgramTitle')
        priorityDetail = t('phaseGuidance.authorProgramDetail')
        actionLabel = t('phaseGuidance.authorProgramAction')
        targetTab = 'program'
        Icon = PresentationChartIcon
        statusBadge = t('phaseGuidance.authorProgramBadge')
        badgeTone = 'muted'
      }
    }
  }

  // Checklist des jalons de la phase en cours (sobre et académique)
  const checklistItems = isScientific
    ? [
        { label: t('phaseGuidance.checkSciPublish'), done: true },
        { label: t('phaseGuidance.checkSciSubmit'), done: submissions.length > 0 },
        { label: t('phaseGuidance.checkSciReview'), done: submissions.some((s) => (s.reviews || []).length > 0) },
        {
          label: t('phaseGuidance.checkSciDecision', {
            done: submissions.length - pendingCount,
            total: submissions.length || 0,
          }),
          done: submissions.length > 0 && pendingCount === 0,
        },
      ]
    : [
        { label: t('phaseGuidance.checkOrgSelection'), done: true },
        { label: t('phaseGuidance.checkOrgRegistrations'), done: true },
        { label: t('phaseGuidance.checkOrgPayments', { count: validatedCount }), done: paymentsToValidate === 0 },
        { label: t('phaseGuidance.checkOrgAssign'), done: acceptedCount > 0 },
        { label: t('phaseGuidance.checkOrgProceedings'), done: true },
      ]

  const toneDots = {
    accent: 'bg-accent',
    warn: 'bg-accent',
    ok: 'bg-emerald-500',
    muted: 'bg-neutral-400',
  }

  return (
    <section
      aria-label={t('phaseGuidance.ariaLabel')}
      className="card border-line bg-surface/90 shadow-card overflow-hidden transition-all duration-200"
    >
      {/* Barre compacte rétractable avec flèche à gauche */}
      <div className="p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex items-center gap-2.5 min-w-0 text-start group cursor-pointer select-none"
        >
          {/* Flèche à gauche rotative */}
          <span
            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200 ${
              expanded
                ? 'rotate-90 bg-accent/20 border-accent/40 text-accent-ink'
                : 'bg-surface-2 border-line text-muted group-hover:text-fg group-hover:border-fg/30'
            }`}
            aria-hidden="true"
          >
            <CaretRightIcon size={14} weight="bold" className={expanded ? '' : 'rtl:rotate-180'} />
          </span>

          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono uppercase tracking-wider text-faint shrink-0">
              {isScientific ? t('phaseGuidance.phaseScientific') : t('phaseGuidance.phaseOrganizational')}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-0.5 rounded-full bg-white text-neutral-800 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10 shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${toneDots[badgeTone] || 'bg-neutral-400'}`} aria-hidden="true" />
              <span>{statusBadge}</span>
            </span>
            <span className="font-semibold text-xs sm:text-sm text-fg truncate">
              {priorityTitle}
            </span>
          </div>
        </button>

        {/* Action directe et bascule de rideau */}
        <div className="flex items-center gap-2 shrink-0">
          {actionLabel && targetTab !== activeTab && (
            <button
              type="button"
              onClick={() => onNavigateTab(targetTab)}
              className="btn-accent btn-sm text-xs gap-1.5 shadow-xs active:scale-95 transition-all"
            >
              <span>{actionLabel}</span>
              <ArrowRightIcon size={13} weight="bold" className="rtl:rotate-180" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="text-[11px] font-medium text-faint hover:text-muted hidden sm:inline-block px-1"
            title={t('phaseGuidance.drawerTitleAttr')}
          >
            {expanded ? t('phaseGuidance.hideDrawer') : t('phaseGuidance.showDrawer')}
          </button>
        </div>
      </div>

      {/* Rideau déployable : Contexte détaillé & Jalons de la phase */}
      {expanded && (
        <div className="border-t border-line/60 bg-surface-2/30 px-4 py-3 sm:px-5 sm:py-4 animate-view-fade space-y-3.5">
          <div className="flex items-start gap-3">
            <span
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
                badgeTone === 'accent'
                  ? 'bg-accent/15 border-accent/30 text-accent-ink'
                  : badgeTone === 'warn'
                    ? 'bg-warn/15 border-warn/30 text-warn'
                    : badgeTone === 'ok'
                      ? 'bg-ok/15 border-ok/30 text-ok'
                      : 'bg-surface-2 border-line text-muted'
              }`}
            >
              <Icon size={18} weight="duotone" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                {priorityDetail}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-line/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-fg">
                {t('phaseGuidance.objectivesHeading', {
                  phase: isScientific ? t('phaseGuidance.phaseScientificName') : t('phaseGuidance.phaseOrganizationalName'),
                })}
              </span>
              <span className="text-[11px] font-mono text-faint">
                {t('phaseGuidance.completedRatio', {
                  done: checklistItems.filter((i) => i.done).length,
                  total: checklistItems.length,
                })}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {checklistItems.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 p-2 rounded-lg text-xs border ${
                    item.done
                      ? 'bg-ok/5 border-ok/25 text-fg'
                      : 'bg-surface border-line/80 text-muted'
                  }`}
                >
                  {item.done ? (
                    <CheckCircleIcon size={15} weight="fill" className="text-ok shrink-0" />
                  ) : (
                    <ClockIcon size={15} className="text-faint shrink-0" />
                  )}
                  <span className={item.done ? 'font-medium' : ''}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {canManage && isScientific && (
            <div className="flex items-center gap-2 pt-1 text-[11px] text-muted border-t border-line/40">
              <LockIcon size={13} className="text-accent-ink shrink-0" />
              <span>
                <strong>{t('phaseGuidance.nextStepConditionLabel')}</strong> {t('phaseGuidance.nextStepConditionBody')}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
