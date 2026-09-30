import { tokenize, termFreq, cosine } from './text'

/** Reviewer matching from paper abstracts vs reviewer profiles (PFE IA). */
export function matchReviewers(submissions, reviewers) {
  return submissions.map((submission) => {
    const paper = termFreq(tokenize(`${submission.title} ${submission.abstract || ''}`))
    const ranked = reviewers
      .map((reviewer) => {
        const profile = termFreq(
          tokenize(`${reviewer.profiles?.full_name || ''} ${reviewer.expertise || reviewer.role_in_event || ''}`),
        )
        const overlap = cosine(paper, profile)
        const fallback = reviewer.role_in_event === 'reviewer' ? 0.12 : 0.04
        return {
          reviewerId: reviewer.user_id || reviewer.id,
          name: reviewer.profiles?.full_name || 'Reviewer',
          score: Math.min(0.99, overlap + fallback),
        }
      })
      .sort((a, b) => b.score - a.score)

    return {
      submissionId: submission.id,
      title: submission.title,
      suggestions: ranked.slice(0, 3),
    }
  })
}
