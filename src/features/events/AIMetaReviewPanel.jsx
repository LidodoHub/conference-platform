import { useState, useEffect, useCallback } from 'react'
import { TreeStructureIcon, WarningCircleIcon, CircleNotchIcon, CheckCircleIcon, QuestionIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { generateMetaReview } from '../../services/aiApi'

const DEMO_REVIEWS = [
  {
    reviewer: 'Reviewer 1 (Domain Specialist)',
    score: 86,
    comment: 'Rigorous methodological approach and convincing experimental results on the test set. A few hyperparameters would benefit from further justification.',
  },
  {
    reviewer: 'Reviewer 2 (Methodology)',
    score: 78,
    comment: 'Solid scientific contribution with a clear comparison against the state of the art. The section on real-time execution constraints remains somewhat brief.',
  },
  {
    reviewer: 'Reviewer 3 (Clarity & Impact)',
    score: 82,
    comment: 'Well-structured and reproducible paper. The cross-validation protocol and memory consumption impact should be clarified.',
  },
]

const CONSENSUS_DOT = {
  Élevé: 'bg-emerald-500',
  Modéré: 'bg-accent',
  Divergent: 'bg-red-500',
  High: 'bg-emerald-500',
  Moderate: 'bg-accent',
}

export default function AIMetaReviewPanel({ eventId }) {
  const [submissions, setSubmissions] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loadingData, setLoadingData] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [usedDemoReviews, setUsedDemoReviews] = useState(false)

  const loadSubmissions = useCallback(async () => {
    setLoadingData(true)
    setError(null)
    const { data, error: subErr } = await supabase
      .from('submissions')
      .select('id, title, abstract, status, reviews(id, score, comments, recommendation, profiles(full_name))')
      .eq('event_id', eventId)
      .order('submitted_at', { ascending: false })

    if (subErr) {
      setError(subErr.message)
      setLoadingData(false)
      return
    }

    const list = data || []
    setSubmissions(list)
    setSelectedId((prev) => (prev && list.some((s) => String(s.id) === prev) ? prev : String(list[0]?.id || '')))
    setLoadingData(false)
  }, [eventId])

  useEffect(() => {
    loadSubmissions()
  }, [loadSubmissions])

  const selectedSub = submissions.find((s) => String(s.id) === selectedId) || null
  const realReviews = selectedSub?.reviews || []

  const runMetaSynthesis = async ({ useDemo = false } = {}) => {
    if (!selectedSub) return
    setRunning(true)
    setError(null)
    setUsedDemoReviews(useDemo)

    try {
      const reviewsPayload = useDemo
        ? DEMO_REVIEWS
        : realReviews.map((r, idx) => ({
            reviewer: r.profiles?.full_name || `Reviewer ${idx + 1}`,
            score: r.score ?? r.recommendation ?? 'N/A',
            comment: r.comments || r.recommendation || '',
          }))

      const data = await generateMetaReview({
        title: selectedSub.title || 'Scientific paper',
        abstract: selectedSub.abstract || '',
        reviews: reviewsPayload,
      })
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div dir="ltr" className="text-left rounded-xl border border-line bg-surface shadow-card p-6 sm:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-surface-2 border border-black/[0.06] dark:border-white/[0.06] text-fg flex items-center justify-center shrink-0">
            <TreeStructureIcon size={22} weight="duotone" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-fg">
                AI Meta-Review
              </h2>
              <span className="text-[11px] font-mono text-muted bg-surface-2 px-2 py-0.5 rounded-md border border-black/[0.06] dark:border-white/[0.06]">
                {result?.model || 'Gemini'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Structured synthesis of reviewer evaluations to inform the scientific committee&apos;s decision.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => runMetaSynthesis({ useDemo: false })}
          disabled={loadingData || !selectedSub || realReviews.length === 0 || running}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg min-h-10 text-xs sm:text-sm font-semibold bg-accent hover:opacity-90 text-on-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
        >
          {running && <CircleNotchIcon size={16} className="animate-spin" aria-hidden="true" />}
          <span>{running ? 'Synthesizing…' : 'Generate Meta-Synthesis'}</span>
        </button>
      </div>

      {/* Paper selector */}
      {!loadingData && submissions.length > 0 && (
        <div className="space-y-1.5">
          <label htmlFor="meta-review-article" className="block text-xs font-medium text-muted">
            Paper to synthesize
          </label>
          <select
            id="meta-review-article"
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value)
              setResult(null)
              setError(null)
            }}
            className="select-field text-xs sm:text-sm"
          >
            {submissions.map((s) => {
              const count = s.reviews?.length || 0
              return (
                <option key={s.id} value={String(s.id)}>
                  {s.title} ({count} {count === 1 ? 'review' : 'reviews'})
                </option>
              )
            })}
          </select>
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
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-24 w-full rounded-xl" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60 p-6 text-center space-y-1">
          <p className="text-sm font-medium text-fg">No submissions for this event</p>
          <p className="text-xs text-muted">
            Submit at least one paper to use the AI meta-synthesis.
          </p>
        </div>
      ) : realReviews.length === 0 && !result ? (
        <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60 p-6 text-center space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-fg">
              No reviews recorded for this paper
            </p>
            <p className="text-xs text-muted">
              Wait for reviewer feedback, or run an immediate demonstration with 3 sample reviews.
            </p>
          </div>
          <button
            type="button"
            onClick={() => runMetaSynthesis({ useDemo: true })}
            disabled={running}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border border-black/[0.08] dark:border-white/[0.1] bg-surface hover:bg-surface-2 text-fg transition-colors cursor-pointer disabled:opacity-50"
          >
            {running && <CircleNotchIcon size={14} className="animate-spin" aria-hidden="true" />}
            <span>Test with 3 demo reviews</span>
          </button>
        </div>
      ) : result ? (
        <div className="space-y-5">
          {/* Header: Consensus badge + Decision hint */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs text-muted font-medium">Consensus:</span>
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-0.5 rounded-full bg-white text-neutral-800 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${CONSENSUS_DOT[result.consensus_level] || CONSENSUS_DOT.Modéré}`} aria-hidden="true" />
                <span>{result.consensus_level}</span>
              </span>
              {usedDemoReviews && (
                <span className="text-[11px] font-mono text-muted px-2 py-0.5 rounded bg-surface-2 border border-black/[0.06] dark:border-white/[0.06]">
                  3 demo reviews
                </span>
              )}
            </div>

            <span className="text-xs sm:text-sm font-semibold text-fg px-3 py-1 rounded-full bg-surface border border-black/[0.06] dark:border-white/[0.06]">
              {result.decision_hint}
            </span>
          </div>

          {/* Committee Synthesis */}
          <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60 p-4 sm:p-5 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Committee Synthesis
            </h3>
            <p className="text-sm text-fg leading-relaxed">
              {result.summary}
            </p>
          </div>

          {/* 2-column grid: Strengths / Points to Clarify */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60 p-4 space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ok flex items-center gap-1.5">
                <CheckCircleIcon size={15} weight="bold" aria-hidden="true" />
                <span>Strengths</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-fg">
                {(result.strengths || []).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-ok mt-1.5 shrink-0" aria-hidden="true" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60 p-4 space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-warn flex items-center gap-1.5">
                <QuestionIcon size={15} weight="bold" aria-hidden="true" />
                <span>Points to Clarify</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-fg">
                {(result.weaknesses || []).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-warn mt-1.5 shrink-0" aria-hidden="true" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-xs text-muted pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
            AI decision support — final arbitration rests with the scientific committee.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60 p-6 text-center space-y-1">
          <p className="text-sm font-medium text-fg">
            {realReviews.length} {realReviews.length === 1 ? 'review available' : 'reviews available'} for this paper
          </p>
          <p className="text-xs text-muted">
            Click &quot;Generate Meta-Synthesis&quot; to obtain a structured summary.
          </p>
        </div>
      )}
    </div>
  )
}
