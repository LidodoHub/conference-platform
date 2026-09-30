import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { matchReviewers } from '../../lib/ai/matching'
import { clusterSubmissions } from '../../lib/ai/clustering'
import { detectPlagiarism } from '../../lib/ai/plagiarism'
import { optimizeAssignments } from '../../lib/ai/qubo'

export default function AiTools({ submissions, reviewers }) {
  const [run, setRun] = useState(false)

  const matches = useMemo(
    () => (run ? matchReviewers(submissions, reviewers) : []),
    [run, submissions, reviewers],
  )
  const clusters = useMemo(
    () => (run ? clusterSubmissions(submissions) : []),
    [run, submissions],
  )
  const pairs = useMemo(
    () => (run ? detectPlagiarism(submissions) : []),
    [run, submissions],
  )
  const assignment = useMemo(
    () => (run ? optimizeAssignments(matches) : []),
    [run, matches],
  )

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">Intelligence artificielle</p>
          <h2 className="section-heading text-xl mt-1">Matching, thèmes, plagiat, QUBO</h2>
          <p className="text-sm text-taupe mt-1 max-w-xl">
            Heuristiques locales (TF-IDF, n-grammes, assignation quadratique). Aucun appel externe.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setRun(true)}>
          Lancer l'analyse
        </button>
      </div>

      {!run && (
        <p className="text-sm text-taupe">Lancez l'analyse une fois les soumissions et reviewers en place.</p>
      )}

      {run && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <article className="card-panel">
            <p className="section-label mb-3">Matching reviewers</p>
            <ul className="space-y-3">
              {matches.map((item) => (
                <li key={item.submissionId} className="text-sm">
                  <p className="font-medium text-ink">{item.title}</p>
                  <p className="text-taupe text-xs mt-1">
                    {item.suggestions.map((s) => `${s.name} (${(s.score * 100).toFixed(0)}%)`).join(' · ') || 'Aucun profil'}
                  </p>
                </li>
              ))}
            </ul>
          </article>

          <article className="card-panel">
            <p className="section-label mb-3">Assignation QUBO / QAOA</p>
            {assignment.length === 0 ? (
              <p className="text-sm text-taupe">Pas assez de reviewers pour une affectation stable.</p>
            ) : (
              <ul className="space-y-2">
                {assignment.map((item) => (
                  <li key={item.submissionId} className="text-sm flex justify-between gap-3">
                    <span className="text-ink truncate">{item.title}</span>
                    <span className="font-mono text-xs text-taupe whitespace-nowrap">
                      {item.name} · E={item.energy}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="card-panel">
            <p className="section-label mb-3">Clustering thématique</p>
            <ul className="space-y-3">
              {clusters.map((cluster) => (
                <li key={cluster.id}>
                  <p className="text-sm font-medium text-ink">{cluster.label}</p>
                  <p className="font-mono text-[10px] text-taupe mt-1">{cluster.terms.join(' · ')}</p>
                  <p className="text-xs text-taupe mt-1">{cluster.papers.map((p) => p.title).join(' ; ')}</p>
                </li>
              ))}
              {clusters.length === 0 && <p className="text-sm text-taupe">Pas assez de textes.</p>}
            </ul>
          </article>

          <article className="card-panel">
            <p className="section-label mb-3">Détection de similarité</p>
            {pairs.length === 0 ? (
              <p className="text-sm text-taupe">Aucun recouvrement notable au seuil 0.28.</p>
            ) : (
              <ul className="space-y-2">
                {pairs.map((pair) => (
                  <li key={`${pair.a.id}-${pair.b.id}`} className="text-sm">
                    <span className="text-ink">{pair.a.title}</span>
                    <span className="text-taupe"> / </span>
                    <span className="text-ink">{pair.b.title}</span>
                    <span className="font-mono text-xs text-gold ml-2">{(pair.score * 100).toFixed(0)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      )}
    </section>
  )
}

export async function loadReviewersForEvent(eventId) {
  const { data } = await supabase
    .from('event_participants')
    .select('id, user_id, role_in_event, profiles(full_name, email)')
    .eq('event_id', eventId)
    .in('role_in_event', ['reviewer', 'organizer'])
  return data || []
}
