import { useState, useEffect, useCallback } from 'react'
import { ShieldCheckIcon, WarningCircleIcon, CircleNotchIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { runAiSimilarity } from '../../services/aiApi'

export default function AISimilarityPanel({ eventId }) {
  const [submissions, setSubmissions] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const loadSubmissions = useCallback(async () => {
    setLoadingData(true)
    setError(null)
    const { data, error: subErr } = await supabase
      .from('submissions')
      .select('id, title, abstract, status')
      .eq('event_id', eventId)
      .order('submitted_at', { ascending: false })

    if (subErr) {
      setError(subErr.message)
      setLoadingData(false)
      return
    }

    setSubmissions(data || [])
    setLoadingData(false)
  }, [eventId])

  useEffect(() => {
    loadSubmissions()
  }, [loadSubmissions])

  const handleAnalyze = async () => {
    setRunning(true)
    setError(null)
    try {
      const data = await runAiSimilarity({
        submissions: submissions.map((s) => ({
          id: String(s.id),
          title: s.title || '',
          abstract: s.abstract || '',
        })),
        threshold: 0.65,
      })
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  const subById = Object.fromEntries(submissions.map((s) => [String(s.id), s]))
  const hasEnough = submissions.length >= 2

  return (
    <div dir="ltr" className="text-left rounded-xl border border-line bg-surface shadow-card p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-surface-2 border border-black/[0.06] dark:border-white/[0.06] text-fg flex items-center justify-center shrink-0">
            <ShieldCheckIcon size={22} weight="duotone" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-fg">
                Similarity Detection
              </h2>
              <span className="text-[11px] font-mono text-muted bg-surface-2 px-2 py-0.5 rounded-md border border-black/[0.06] dark:border-white/[0.06]">
                SBERT Cosine
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Cross-analysis of titles and abstracts to detect duplicates or high overlap (&gt; 65%).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loadingData || !hasEnough || running}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg min-h-10 text-xs sm:text-sm font-semibold bg-accent hover:opacity-90 text-on-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
        >
          {running && <CircleNotchIcon size={16} className="animate-spin" aria-hidden="true" />}
          <span>{running ? 'Analyzing…' : 'Analyze Similarity'}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-bad/30 bg-bad/10 text-bad text-xs sm:text-sm">
          <WarningCircleIcon size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {loadingData ? (
        <div className="space-y-2.5">
          <div className="skeleton h-16 w-full rounded-xl" />
          <div className="skeleton h-10 w-full rounded-xl" />
        </div>
      ) : !hasEnough ? (
        <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60 p-6 text-center space-y-1.5">
          <p className="text-sm font-medium text-fg">
            At least 2 submitted papers required
          </p>
          <p className="text-xs text-muted">
            This event currently has {submissions.length} {submissions.length === 1 ? 'submission' : 'submissions'}. Add or wait for at least 2 papers to run the cross-comparison.
          </p>
        </div>
      ) : result ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60 p-4">
              <span className="text-xs text-muted block">Papers Analyzed</span>
              <span className="num text-xl font-bold text-fg mt-1 block">{result.analyzed_count}</span>
            </div>
            <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60 p-4">
              <span className="text-xs text-muted block">Max Similarity</span>
              <span className="num text-xl font-bold text-fg mt-1 block">{result.max_similarity_percent}%</span>
            </div>
            <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60 p-4">
              <span className="text-xs text-muted block">Alerts (&gt; 65%)</span>
              <span className={`num text-xl font-bold mt-1 block ${result.flagged_count > 0 ? 'text-warn' : 'text-ok'}`}>
                {result.flagged_count}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-black/[0.06] dark:border-white/[0.06]">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.06] bg-surface-2/60 text-muted text-xs">
                  <th className="py-3 px-4 font-semibold">Paper A</th>
                  <th className="py-3 px-4 font-semibold">Paper B</th>
                  <th className="py-3 px-4 font-semibold text-right w-44">Similarity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {(result.pairs || []).map((p) => {
                  const subA = subById[p.sub_a_id]
                  const subB = subById[p.sub_b_id]
                  return (
                    <tr key={`${p.sub_a_id}-${p.sub_b_id}`} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-fg max-w-md">
                        <span className="line-clamp-2">{subA?.title || p.sub_a_id}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-fg max-w-md">
                        <span className="line-clamp-2">{subB?.title || p.sub_b_id}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2.5">
                          <div className="w-20 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${p.flagged ? 'bg-warn' : 'bg-fg/40'}`}
                              style={{ width: `${Math.min(100, Math.max(0, p.similarity_percent))}%` }}
                            />
                          </div>
                          <span className={`num text-xs font-semibold w-12 text-right ${p.flagged ? 'text-warn' : 'text-fg'}`}>
                            {p.similarity_percent}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60 p-6 text-center space-y-1">
          <p className="text-sm font-medium text-fg">
            {submissions.length} papers ready to be compared
          </p>
          <p className="text-xs text-muted">
            Click &quot;Analyze Similarity&quot; to compute the SBERT cosine matrix.
          </p>
        </div>
      )}
    </div>
  )
}
