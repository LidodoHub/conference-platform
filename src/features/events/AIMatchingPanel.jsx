import { useState, useEffect, useCallback } from 'react'
import { BrainIcon, CheckCircleIcon, WarningCircleIcon, CircleNotchIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { runAiMatching } from '../../services/aiApi'
import { assignReviewer, loadLocalAssignmentMap } from '../../lib/assignments'

export default function AIMatchingPanel({ eventId, onAssigned }) {
  const [submissions, setSubmissions] = useState([])
  const [reviewers, setReviewers] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [matches, setMatches] = useState([])
  const [hasRun, setHasRun] = useState(false)
  const [assignedMap, setAssignedMap] = useState(() => loadLocalAssignmentMap(eventId))
  const [assigningKey, setAssigningKey] = useState(null)

  const loadEventEntities = useCallback(async () => {
    setLoadingData(true)
    setError(null)

    const [subRes, partRes] = await Promise.all([
      supabase
        .from('submissions')
        .select('id, title, abstract, status')
        .eq('event_id', eventId)
        .order('submitted_at', { ascending: false }),
      supabase
        .from('event_participants')
        .select('user_id, role_in_event, profiles(id, full_name, email, expertise, affiliation)')
        .eq('event_id', eventId),
    ])

    if (subRes.error || partRes.error) {
      setError((subRes.error || partRes.error).message)
      setLoadingData(false)
      return
    }

    const subs = subRes.data || []
    const allParts = (partRes.data || []).filter((p) => p.profiles)
    const explicitReviewers = allParts.filter((p) => p.role_in_event === 'reviewer')
    const eligible = (explicitReviewers.length > 0 ? explicitReviewers : allParts).map((p) => ({
      id: p.profiles.id || p.user_id,
      name: p.profiles.full_name || p.profiles.email || 'Researcher',
      expertise: [p.profiles.expertise, p.profiles.affiliation].filter(Boolean).join(' — '),
      role: p.role_in_event,
    }))

    setSubmissions(subs)
    setReviewers(eligible)
    setLoadingData(false)
  }, [eventId])

  useEffect(() => {
    loadEventEntities()
  }, [loadEventEntities])

  const handleRunMatching = async () => {
    setRunning(true)
    setError(null)
    try {
      const data = await runAiMatching({
        submissions: submissions.map((s) => ({
          id: String(s.id),
          title: s.title || '',
          abstract: s.abstract || '',
        })),
        reviewers: reviewers.map((r) => ({
          id: String(r.id),
          name: r.name || '',
          expertise: r.expertise || r.name || '',
        })),
        maxLoad: 3,
      })
      setMatches(data.matches || [])
      setHasRun(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  const handleAssign = async (submissionId, reviewerId) => {
    const key = `${submissionId}:${reviewerId}`
    setAssigningKey(key)
    const next = await assignReviewer(eventId, submissionId, reviewerId)
    setAssignedMap(next)
    setAssigningKey(null)
    onAssigned?.()
  }

  const subById = Object.fromEntries(submissions.map((s) => [String(s.id), s]))
  const revById = Object.fromEntries(reviewers.map((r) => [String(r.id), r]))

  const canRun = !loadingData && submissions.length > 0 && reviewers.length > 0

  return (
    <div dir="ltr" className="text-left rounded-xl border border-line bg-surface shadow-card p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-surface-2 border border-black/[0.06] dark:border-white/[0.06] text-fg flex items-center justify-center shrink-0">
            <BrainIcon size={22} weight="duotone" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-fg">
                Reviewer Matching
              </h2>
              <span className="text-[11px] font-mono text-muted bg-surface-2 px-2 py-0.5 rounded-md border border-black/[0.06] dark:border-white/[0.06]">
                SBERT MiniLM-L12-v2
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Semantic assignment between submitted abstracts and reviewer expertise (max load: 3).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRunMatching}
          disabled={!canRun || running}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg min-h-10 text-xs sm:text-sm font-semibold bg-accent hover:opacity-90 text-on-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
        >
          {running && <CircleNotchIcon size={16} className="animate-spin" aria-hidden="true" />}
          <span>{running ? 'Computing…' : 'Run SBERT Matching'}</span>
        </button>
      </div>

      {!loadingData && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className="px-2.5 py-1 rounded-full bg-surface-2 border border-black/[0.06] dark:border-white/[0.06] num">
            {submissions.length} {submissions.length === 1 ? 'paper' : 'papers'}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-surface-2 border border-black/[0.06] dark:border-white/[0.06] num">
            {reviewers.length} {reviewers.length === 1 ? 'eligible reviewer' : 'eligible reviewers'}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-bad/30 bg-bad/10 text-bad text-xs sm:text-sm">
          <WarningCircleIcon size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {loadingData ? (
        <div className="space-y-2.5">
          <div className="skeleton h-10 w-full rounded-xl" />
          <div className="skeleton h-10 w-full rounded-xl" />
          <div className="skeleton h-10 w-full rounded-xl" />
        </div>
      ) : submissions.length === 0 || reviewers.length === 0 ? (
        <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60 p-6 text-center space-y-1.5">
          <p className="text-sm font-medium text-fg">Insufficient data for matching</p>
          <p className="text-xs text-muted">
            At least 1 submitted paper and 1 registered member/reviewer are required for this event.
          </p>
        </div>
      ) : hasRun && matches.length === 0 ? (
        <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60 p-6 text-center space-y-1.5">
          <p className="text-sm font-medium text-fg">No assignments generated</p>
          <p className="text-xs text-muted">Check the submissions and reviewer profiles.</p>
        </div>
      ) : hasRun ? (
        <div className="overflow-x-auto rounded-xl border border-black/[0.06] dark:border-white/[0.06]">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.06] bg-surface-2/60 text-muted text-xs">
                <th className="py-3 px-4 font-semibold">Paper</th>
                <th className="py-3 px-4 font-semibold">Recommended Reviewer</th>
                <th className="py-3 px-4 font-semibold text-right">Compatibility</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {matches.map((m) => {
                const sub = subById[m.submission_id]
                const rev = revById[m.reviewer_id]
                const key = `${m.submission_id}:${m.reviewer_id}`
                const isAssigned = Boolean(assignedMap[key])
                const isAssigning = assigningKey === key

                return (
                  <tr key={key} className="hover:bg-surface-2/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-fg max-w-md">
                      <span className="line-clamp-2">{sub?.title || m.submission_id}</span>
                    </td>
                    <td className="py-3 px-4 text-fg">
                      <span className="font-medium block">{rev?.name || m.reviewer_id}</span>
                      {rev?.expertise && (
                        <span className="text-xs text-muted line-clamp-1">{rev.expertise}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="num font-semibold text-fg px-2.5 py-1 rounded-full bg-surface-2 border border-black/[0.06] dark:border-white/[0.06]">
                        {m.score_percent}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isAssigned ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ok px-3 py-1.5 rounded-lg bg-ok/10">
                          <CheckCircleIcon size={14} weight="bold" aria-hidden="true" />
                          <span>Assigned</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAssign(m.submission_id, m.reviewer_id)}
                          disabled={isAssigning}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-black/[0.08] dark:border-white/[0.1] bg-surface-2 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-fg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isAssigning ? 'Assigning…' : 'Assign'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60 p-6 text-center space-y-1">
          <p className="text-sm font-medium text-fg">Ready for analysis</p>
          <p className="text-xs text-muted">
            Click &quot;Run SBERT Matching&quot; to compute assignment recommendations.
          </p>
        </div>
      )}
    </div>
  )
}
