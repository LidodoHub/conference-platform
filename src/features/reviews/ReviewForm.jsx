import { useState, useEffect } from 'react'
import { StarIcon, CheckCircleIcon, WarningCircleIcon, XCircleIcon, ThumbsUpIcon, NotePencilIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { frError } from '../../lib/errors'

const RECOMMENDATIONS = [
  { value: 'accept', label: 'Accepter', hint: 'Article rigoureux et prêt pour publication.', icon: CheckCircleIcon, color: 'text-ok', bg: 'bg-ok/10 border-ok/50' },
  { value: 'revise', label: 'Révision requise', hint: 'Bon fond scientifique, corrections nécessaires.', icon: WarningCircleIcon, color: 'text-warn', bg: 'bg-warn/10 border-warn/50' },
  { value: 'reject', label: 'Rejeter', hint: 'Hors thématique ou méthodologie insuffisante.', icon: XCircleIcon, color: 'text-bad', bg: 'bg-bad/10 border-bad/50' },
]

const SCORE_LABELS = {
  1: { title: '1 - Insuffisant', desc: 'Faiblesses méthodologiques majeures' },
  2: { title: '2 - Passable', desc: 'Résultats incomplets ou manque d’originalité' },
  3: { title: '3 - Conforme', desc: 'Travail correct répondant aux critères' },
  4: { title: '4 - Bon travail', desc: 'Rigueur scientifique et contribution claire' },
  5: { title: '5 - Remarquable', desc: 'Excellente qualité, à retenir en priorité' },
}

export default function ReviewForm({ submissionId, eventId, onReviewed }) {
  const { user } = useAuth()
  const [score, setScore] = useState(4)
  const [strengths, setStrengths] = useState('')
  const [improvements, setImprovements] = useState('')
  const [generalComment, setGeneralComment] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [sessions, setSessions] = useState([])
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!eventId) return
    supabase
      .from('sessions')
      .select('id, title')
      .eq('event_id', eventId)
      .order('title', { ascending: true })
      .then(({ data }) => setSessions(data || []))
  }, [eventId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!recommendation) {
      setError('Veuillez sélectionner une recommandation formelle.')
      return
    }

    // Packaging structuré des commentaires IEEE/ACM
    const sections = []
    if (strengths.trim()) sections.push(`Points forts :\n${strengths.trim()}`)
    if (improvements.trim()) sections.push(`Axes d’amélioration :\n${improvements.trim()}`)
    if (generalComment.trim()) sections.push(`Remarques générales :\n${generalComment.trim()}`)
    const fullComment = sections.join('\n\n')

    setSubmitting(true)
    setError(null)
    const { error: reviewError } = await supabase.from('reviews').insert({
      submission_id: submissionId,
      reviewer_id: user.id,
      score,
      comments: fullComment,
      recommendation,
      recommended_session_id: recommendation === 'accept' && sessionId ? sessionId : null,
    })
    setSubmitting(false)
    if (reviewError) {
      setError(frError(reviewError))
      return
    }
    onReviewed()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 pt-5 border-t border-line space-y-6">
      {/* 1. Barème tactile de note globale */}
      <fieldset className="space-y-2">
        <legend className="form-label flex items-center justify-between">
          <span>Évaluation globale par les pairs</span>
          <span className="text-xs text-accent-ink font-semibold">{SCORE_LABELS[score].title}</span>
        </legend>

        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = score === n
            return (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                  active
                    ? 'bg-accent/20 border-accent text-fg shadow-xs ring-1 ring-accent/40 font-bold'
                    : 'bg-surface/50 border-line text-muted hover:border-fg/30'
                }`}
              >
                <div className="flex items-center gap-0.5">
                  <StarIcon size={16} weight={n <= score ? 'fill' : 'regular'} className={n <= score ? 'text-accent' : 'text-faint'} />
                </div>
                <span className="num text-sm">{n}/5</span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted mt-1">{SCORE_LABELS[score].desc}</p>
      </fieldset>

      {/* 2. Recommandation collégiale sous forme de cartes */}
      <fieldset className="space-y-2">
        <legend className="form-label">Recommandation au comité scientifique</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {RECOMMENDATIONS.map((r) => {
            const active = recommendation === r.value
            const Icon = r.icon
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => {
                  setRecommendation(r.value)
                  if (r.value !== 'accept') setSessionId('')
                }}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  active
                    ? `${r.bg} shadow-xs ring-1 ring-accent/30`
                    : 'bg-surface/40 border-line text-muted hover:border-fg/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={18} className={active ? r.color : 'text-faint'} weight="duotone" />
                  <span className={`text-sm font-semibold ${active ? 'text-fg' : 'text-fg/80'}`}>{r.label}</span>
                </div>
                <span className="text-[11px] text-muted leading-tight">{r.hint}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* 3. Suggestion de session si accepté */}
      {recommendation === 'accept' && sessions.length > 0 && (
        <div className="p-3.5 rounded-xl bg-surface-2/40 border border-line space-y-1.5">
          <label htmlFor={`session-${submissionId}`} className="form-label text-xs">
            Session scientifique recommandée (Optionnel)
          </label>
          <select
            id={`session-${submissionId}`}
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="select-field text-xs sm:max-w-md"
          >
            <option value="">Pas de session spécifique</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 4. Grille de feedback structurée (IEEE / ACM) */}
      <div className="space-y-4">
        <div>
          <label htmlFor={`strengths-${submissionId}`} className="form-label flex items-center gap-1.5">
            <ThumbsUpIcon size={14} className="text-ok" />
            <span>Points forts du travail</span>
          </label>
          <textarea
            id={`strengths-${submissionId}`}
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            className="textarea-field text-xs sm:text-sm"
            rows={2}
            placeholder="Méthodologie solide, originalité du problème, résultats expérimentaux clairs..."
          />
        </div>

        <div>
          <label htmlFor={`improvements-${submissionId}`} className="form-label flex items-center gap-1.5">
            <NotePencilIcon size={14} className="text-warn" />
            <span>Axes d’amélioration & Remarques pour les auteurs</span>
          </label>
          <textarea
            id={`improvements-${submissionId}`}
            value={improvements}
            onChange={(e) => setImprovements(e.target.value)}
            className="textarea-field text-xs sm:text-sm"
            rows={3}
            placeholder="Préciser l'état de l'art, ajouter des métriques de comparaison, corriger la formulation..."
          />
        </div>

        <div>
          <label htmlFor={`general-${submissionId}`} className="form-label">
            Remarques générales & Synthèse (Optionnel)
          </label>
          <textarea
            id={`general-${submissionId}`}
            value={generalComment}
            onChange={(e) => setGeneralComment(e.target.value)}
            className="textarea-field text-xs sm:text-sm"
            rows={2}
            placeholder="Conseils supplémentaires ou synthèse pour le comité..."
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="alert-error">
          {error}
        </div>
      )}

      <div className="pt-2 flex items-center justify-between gap-3">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Envoi en cours…' : 'Valider & Transmettre mon évaluation'}
        </button>
        <span className="text-xs text-faint">Transmis anonymement au comité</span>
      </div>
    </form>
  )
}
