// Source unique des libellés et des couleurs de statut.
// Les couleurs renvoient aux tokens définis dans index.css (@theme) pour rester cohérentes partout.

export const TYPE_LABELS = {
  conference: 'Conférence',
  colloquium: 'Colloque',
  seminar: 'Séminaire',
  workshop: 'Workshop',
}

export const STATUS_LABELS = {
  draft: 'Brouillon',
  pending_approval: 'En validation',
  published: 'Publié',
  ongoing: 'En cours',
  closed: 'Clôturé',
  archived: 'Archivé',
}

export const STATUS_BADGE = {
  draft: 'badge-draft',
  pending_approval: 'badge-pending',
  published: 'badge-published',
  ongoing: 'badge-ongoing',
  closed: 'badge-closed',
  archived: 'badge-archived',
}

export const PHASE_LABELS = {
  scientific: 'Phase scientifique',
  organizational: 'Phase organisationnelle',
}

export const FORMAT_LABELS = {
  onsite: 'Présentiel',
  online: 'En ligne',
  hybrid: 'Hybride',
}

export const SUBMISSION_LABELS = {
  submitted: 'Soumis',
  accepted: 'Accepté',
  rejected: 'Rejeté',
  revision_requested: 'Révision demandée',
}

// blanc = soumis, vert = accepté, orange = révision, rouge = rejeté
export const SUBMISSION_COLOR = {
  submitted: 'var(--color-st-neutral)',
  accepted: 'var(--color-st-ok)',
  revision_requested: 'var(--color-st-warn)',
  rejected: 'var(--color-st-bad)',
}

export const REVISION_LABELS = { minor: 'Révision mineure', major: 'Révision majeure' }

export const RECOMMENDATION_LABELS = {
  accept: "Recommande d'accepter",
  reject: 'Recommande de rejeter',
  revise: 'Recommande une révision',
}

export const RECOMMENDATION_COLOR = {
  accept: 'var(--color-st-ok)',
  reject: 'var(--color-st-bad)',
  revise: 'var(--color-st-warn)',
}

export const ROLE_LABELS = {
  participant: 'Participant',
  reviewer: 'Reviewer',
  organizer: 'Organisateur',
  admin: 'Administrateur',
}

export const ROLE_COLOR = {
  organizer: 'var(--color-st-gold)',
  reviewer: 'var(--color-st-info)',
  participant: 'var(--color-st-muted)',
}

export const REGISTRATION_LABELS = {
  invited: 'Invité',
  payment_submitted: 'Paiement déclaré',
  validated: 'Inscription validée',
}

export const REGISTRATION_COLOR = {
  invited: 'var(--color-st-muted)',
  payment_submitted: 'var(--color-st-warn)',
  validated: 'var(--color-st-ok)',
}

export const SESSION_TYPE_LABELS = {
  talk: 'Présentation',
  workshop: 'Atelier',
  panel: 'Table ronde',
}

export const MAX_ACCEPTED_PER_AUTHOR = 2

// une date seule ("2026-10-04") est lue en heure locale ; un horodatage complet est converti tel quel
const parseDay = (d) => {
  if (!d) return null
  const str = String(d)
  return str.length <= 10 ? new Date(`${str}T00:00:00`) : new Date(str)
}

export const formatDate = (d, opts = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  parseDay(d)?.toLocaleDateString('fr-FR', opts) || ''

export const formatDateRange = (start, end) => {
  const a = formatDate(start)
  if (!end || String(end).slice(0, 10) === String(start).slice(0, 10)) return a
  return `${a} → ${formatDate(end)}`
}

// nom de fichier lisible et sans accents
export const slug = (text) =>
  String(text || 'document')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60)
