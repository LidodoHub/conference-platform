/** Actions et infos réellement utiles pour l'utilisateur du site */

export function getClientActions(isAdmin) {
  const actions = [
    {
      id: 'events',
      title: 'Événements',
      description:
        'Consultez les conférences publiées, créez un événement ou ouvrez une fiche pour gérer inscriptions, soumissions et reviews.',
      cta: 'Accéder aux événements',
      accent: 'ink',
    },
  ]

  if (isAdmin) {
    actions.push({
      id: 'admin',
      title: 'Administration',
      description: 'Validez ou refusez les demandes de publication soumises par les organisateurs.',
      cta: 'Ouvrir le panel admin',
      accent: 'gold',
    })
  }

  return actions
}

/** Rappel discret : tout se passe dans la fiche événement, pas besoin de modules séparés */
export const IN_EVENT_FEATURES = [
  'Inscription à un événement',
  'Paiement et certificat de participation',
  'Soumission d\'articles scientifiques',
  'Reviews et décisions (reviewers / organisateur)',
  'Gestion des rôles participants (organisateur)',
]

export const ROLE_LABELS = {
  admin: 'Administrateur',
  organizer: 'Organisateur',
  reviewer: 'Reviewer',
  participant: 'Participant',
}
