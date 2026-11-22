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
        priorityTitle = `${pendingCount} communication${pendingCount > 1 ? 's' : ''} en attente d'arbitrage`
        priorityDetail = 'Les avis des pairs sont déposés. Prononcez les acceptations ou demandes de révision.'
        actionLabel = 'Examiner les articles'
        targetTab = 'scientific'
        Icon = ArticleIcon
        statusBadge = 'Arbitrage requis'
        badgeTone = 'accent'
      } else if (submissions.length > 0) {
        priorityTitle = 'Sélection scientifique finalisée'
        priorityDetail = `${acceptedCount} article${acceptedCount > 1 ? 's' : ''} retenu${acceptedCount > 1 ? 's' : ''}. Vous pouvez basculer l’événement en phase organisationnelle pour ouvrir les inscriptions.`
        actionLabel = 'Paramètres de phase'
        targetTab = 'org-settings'
        Icon = CheckCircleIcon
        statusBadge = 'Prêt pour la logistique'
        badgeTone = 'ok'
      } else {
        priorityTitle = 'Appel à communications en cours'
        priorityDetail = 'La plateforme reçoit les dépôts de résumés scientifiques des chercheurs.'
        actionLabel = 'Consulter les soumissions'
        targetTab = 'scientific'
        Icon = ClockIcon
        statusBadge = 'Dépôts ouverts'
        badgeTone = 'muted'
      }
    } else {
      // Phase Organisationnelle
      if (paymentsToValidate > 0) {
        priorityTitle = `${paymentsToValidate} règlement${paymentsToValidate > 1 ? 's' : ''} à valider`
        priorityDetail = 'Des participants ont déclaré leur paiement par virement ou bon de commande.'
        actionLabel = 'Vérifier les inscriptions'
        targetTab = 'org-registrations'
        Icon = TicketIcon
        statusBadge = 'Comptabilité'
        badgeTone = 'warn'
      } else {
        priorityTitle = 'Préparation logistique & Programme'
        priorityDetail = `${validatedCount} participant${validatedCount > 1 ? 's' : ''} validé${validatedCount > 1 ? 's' : ''}. Répartissez les communications dans les sessions et amphis.`
        actionLabel = 'Gérer le programme'
        targetTab = 'program'
        Icon = PresentationChartIcon
        statusBadge = 'Logistique active'
        badgeTone = 'ok'
      }
    }
  } else if (isReviewer) {
    if (isScientific) {
      if (reviewsToCount > 0) {
        priorityTitle = `${reviewsToCount} article${reviewsToCount > 1 ? 's' : ''} assigné${reviewsToCount > 1 ? 's' : ''} à relire`
        priorityDetail = 'Votre expertise est sollicitée par le comité scientifique pour noter ces communications.'
        actionLabel = 'Accéder aux relectures'
        targetTab = 'scientific'
        Icon = ArticleIcon
        statusBadge = 'Action requise'
        badgeTone = 'accent'
      } else {
        priorityTitle = 'Relectures à jour'
        priorityDetail = 'Vos évaluations ont bien été enregistrées par le comité de programme.'
        actionLabel = 'Voir mes avis'
        targetTab = 'scientific'
        Icon = CheckCircleIcon
        statusBadge = 'Finalisé'
        badgeTone = 'ok'
      }
    } else {
      priorityTitle = 'Phase d’évaluation close'
      priorityDetail = 'Le processus de sélection scientifique est terminé. Consultez le programme officiel.'
      actionLabel = 'Voir les sessions'
      targetTab = 'program'
      Icon = PresentationChartIcon
      statusBadge = 'Sélection close'
      badgeTone = 'muted'
    }
  } else {
    // Participant / Auteur
    if (isScientific) {
      if (myPendingRevision.length > 0) {
        priorityTitle = `Révision requise : « ${myPendingRevision[0].title} »`
        priorityDetail = 'Prenez connaissance des retours formulés par les reviewers et déposez votre version modifiée.'
        actionLabel = 'Déposer la révision'
        targetTab = 'scientific'
        Icon = WarningCircleIcon
        statusBadge = 'Correction attendue'
        badgeTone = 'warn'
      } else if (submissions.length > 0) {
        priorityTitle = 'Communication soumise au comité'
        priorityDetail = 'Votre résumé est en cours d’examen par les membres du comité scientifique.'
        actionLabel = 'Suivre ma soumission'
        targetTab = 'scientific'
        Icon = ClockIcon
        statusBadge = 'En évaluation'
        badgeTone = 'muted'
      } else {
        priorityTitle = 'Appel à communications ouvert'
        priorityDetail = 'Vous pouvez soumettre un titre et un résumé scientifique pour participer à cette conférence.'
        actionLabel = 'Soumettre un article'
        targetTab = 'scientific'
        Icon = SparkleIcon
        statusBadge = 'Appel en cours'
        badgeTone = 'accent'
      }
    } else {
      // Phase Organisationnelle
      if (myAccepted.length > 0) {
        if (isParticipantValidated) {
          priorityTitle = 'Inscription confirmée • Pass actif'
          priorityDetail = 'Votre communication est retenue et votre badge d’accès numérique est prêt.'
          actionLabel = 'Afficher mon pass'
          targetTab = 'overview'
          Icon = ShieldCheckIcon
          statusBadge = 'Accès accordé'
          badgeTone = 'ok'
        } else {
          priorityTitle = `Article retenu : « ${myAccepted[0].title} »`
          priorityDetail = 'Félicitations. Veuillez finaliser le règlement de vos droits d’inscription pour obtenir votre badge.'
          actionLabel = 'Régler mon inscription'
          targetTab = 'overview'
          Icon = TicketIcon
          statusBadge = 'Paiement requis'
          badgeTone = 'accent'
        }
      } else {
        priorityTitle = 'Programme des sessions publié'
        priorityDetail = 'Consultez les horaires de passage, les amphithéâtres et les keynotes prévues.'
        actionLabel = 'Consulter le programme'
        targetTab = 'program'
        Icon = PresentationChartIcon
        statusBadge = 'Accessible'
        badgeTone = 'muted'
      }
    }
  }

  // Checklist des jalons de la phase en cours (sobre et académique)
  const checklistItems = isScientific
    ? [
        { label: 'Publication de l’appel à communications', done: true },
        { label: 'Dépôt des résumés par les auteurs', done: submissions.length > 0 },
        { label: 'Évaluation par les pairs (Relectures)', done: submissions.some((s) => (s.reviews || []).length > 0) },
        {
          label: `Arbitrage final du comité (${submissions.length - pendingCount}/${submissions.length || 0})`,
          done: submissions.length > 0 && pendingCount === 0,
        },
      ]
    : [
        { label: 'Validation de la sélection scientifique', done: true },
        { label: 'Ouverture des inscriptions & règlements', done: true },
        { label: `Vérification comptable des paiements (${validatedCount} validés)`, done: paymentsToValidate === 0 },
        { label: 'Affectation des articles aux sessions & amphis', done: acceptedCount > 0 },
        { label: 'Publication du recueil officiel des actes (PDF)', done: true },
      ]

  const toneClasses = {
    accent: 'border-accent/40 bg-accent/8 text-accent-ink',
    warn: 'border-warn/40 bg-warn/8 text-warn',
    ok: 'border-ok/40 bg-ok/8 text-ok',
    muted: 'border-line bg-surface-2/60 text-muted',
  }

  return (
    <section
      aria-label="Guidage de phase et actions prioritaires"
      className="card border-line bg-surface/90 shadow-xs overflow-hidden transition-all duration-200"
    >
      {/* Barre compacte rétractable avec flèche à gauche */}
      <div className="p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex items-center gap-2.5 min-w-0 text-left group cursor-pointer select-none"
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
            <CaretRightIcon size={14} weight="bold" />
          </span>

          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono uppercase tracking-wider text-faint shrink-0">
              {isScientific ? 'Phase 1 • Scientifique' : 'Phase 2 • Logistique'}
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.2 rounded-full border shrink-0 ${toneClasses[badgeTone]}`}>
              {statusBadge}
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
              <ArrowRightIcon size={13} weight="bold" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="text-[11px] font-medium text-faint hover:text-muted hidden sm:inline-block px-1"
            title="Déplier ou replier les détails et la checklist des jalons"
          >
            {expanded ? 'Masquer le rideau' : 'Objectifs & Jalons'}
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
                Objectifs & Jalons de la {isScientific ? 'Phase Scientifique' : 'Phase Organisationnelle'}
              </span>
              <span className="text-[11px] font-mono text-faint">
                {checklistItems.filter((i) => i.done).length} / {checklistItems.length} complétés
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
                <strong>Condition pour passer à l’étape suivante :</strong> prononcer toutes les décisions d'arbitrage sur les articles déposés.
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
