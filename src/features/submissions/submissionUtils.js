import { SUBMISSION_LABELS, REVISION_LABELS } from '../../lib/constants'

// reviews réellement envoyées (les anciennes lignes "Assignation…" n'ont pas de recommandation)
export const sentReviews = (s) => (s.reviews || []).filter((r) => r.recommendation)

export const realComment = (r) => Boolean(r.comments) && !r.comments.startsWith('Assignation')

export const averageScore = (s) => {
  const list = sentReviews(s)
  if (!list.length) return null
  return list.reduce((sum, r) => sum + Number(r.score || 0), 0) / list.length
}

export const latestRevision = (s) =>
  [...(s.decisions || [])]
    .filter((d) => d.status === 'revision_requested')
    .sort((a, b) => new Date(b.decided_at) - new Date(a.decided_at))[0] || null

export const statusLabel = (s) => {
  if (s.status === 'revision_requested') {
    const rev = latestRevision(s)
    if (rev?.revision_type) return REVISION_LABELS[rev.revision_type]
  }
  return SUBMISSION_LABELS[s.status] || s.status
}

export const REVISION_HINTS = {
  minor: 'Corrections légères attendues : formulation, précisions, coquilles.',
  major: 'Remaniement important attendu : méthode, résultats ou structure.',
}
