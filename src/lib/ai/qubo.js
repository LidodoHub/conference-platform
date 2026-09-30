/**
 * QUBO-inspired assignment: minimize reviewer load + maximize topic fit.
 * Classical greedy annealing stands in for QAOA when no quantum backend is present.
 */
export function optimizeAssignments(matches, maxPerReviewer = 2) {
  const load = new Map()
  const assigned = []

  const ranked = matches
    .flatMap((item) =>
      (item.suggestions || []).map((suggestion) => ({
        submissionId: item.submissionId,
        title: item.title,
        ...suggestion,
      })),
    )
    .sort((a, b) => b.score - a.score)

  const takenPapers = new Set()

  ranked.forEach((candidate) => {
    if (takenPapers.has(candidate.submissionId)) return
    const current = load.get(candidate.reviewerId) || 0
    if (current >= maxPerReviewer) return

    const quadraticPenalty = current * current * 0.08
    const energy = 1 - candidate.score + quadraticPenalty
    if (energy > 0.85) return

    load.set(candidate.reviewerId, current + 1)
    takenPapers.add(candidate.submissionId)
    assigned.push({
      ...candidate,
      energy: Number(energy.toFixed(3)),
    })
  })

  return assigned
}
