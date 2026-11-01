import { useState } from 'react'
import { SparkleIcon, EyeIcon, NotePencilIcon, CheckIcon, UserPlusIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { frError } from '../../lib/errors'

const words = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0)

const SUGGESTED_KEYWORDS = [
  'Intelligence Artificielle',
  'Vision par Ordinateur',
  'Optimisation QUBO',
  'NLP / Traitement du Langage',
  'Cybersécurité',
  'Systèmes Distribués',
  'Calcul Haute Performance',
]

export default function SubmissionForm({ eventId, onSubmitted }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [abstract, setAbstract] = useState('')
  const [coauthors, setCoauthors] = useState('')
  const [keywords, setKeywords] = useState([])
  const [keywordInput, setKeywordInput] = useState('')
  const [previewMode, setPreviewMode] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const addKeyword = (kw) => {
    const clean = kw.trim()
    if (!clean || keywords.includes(clean)) return
    setKeywords([...keywords, clean])
    setKeywordInput('')
  }

  const removeKeyword = (kw) => {
    setKeywords(keywords.filter((k) => k !== kw))
  }

  const handleKeyDownKeyword = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addKeyword(keywordInput)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // Concaténer les mots-clés et co-auteurs au résumé si présents
    let fullAbstract = abstract.trim()
    if (keywords.length > 0) {
      fullAbstract += `\n\nMots-clés : ${keywords.join(', ')}`
    }
    if (coauthors.trim()) {
      fullAbstract += `\nCo-auteurs déclarés : ${coauthors.trim()}`
    }

    const { error: insertError } = await supabase.from('submissions').insert({
      event_id: eventId,
      author_id: user.id,
      title: title.trim(),
      abstract: fullAbstract,
      status: 'submitted',
    })
    setSubmitting(false)
    if (insertError) {
      setError(frError(insertError))
      return
    }
    setTitle('')
    setAbstract('')
    setKeywords([])
    setCoauthors('')
    onSubmitted()
  }

  const n = words(abstract)
  const wordStatus = n === 0 ? 'text-muted' : n < 100 ? 'text-warn' : n > 500 ? 'text-bad' : 'text-ok font-semibold'

  return (
    <form onSubmit={handleSubmit} className="card-panel space-y-6 rise shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-fg">Déposer un article scientifique</h3>
          <p className="text-xs text-muted mt-0.5">
            Votre communication sera anonymisée et évaluée par le comité scientifique de la conférence.
          </p>
        </div>

        {/* Commutateur Édition / Aperçu Preprint */}
        <div className="flex items-center rounded-xl border border-line bg-surface/80 p-0.5 shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setPreviewMode(false)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              !previewMode ? 'bg-accent/20 text-accent-ink font-semibold shadow-xs' : 'text-muted hover:text-fg'
            }`}
          >
            <NotePencilIcon size={14} />
            Édition
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode(true)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              previewMode ? 'bg-accent/20 text-accent-ink font-semibold shadow-xs' : 'text-muted hover:text-fg'
            }`}
          >
            <EyeIcon size={14} />
            Aperçu Preprint
          </button>
        </div>
      </div>

      {!previewMode ? (
        <div className="space-y-5">
          <div>
            <label htmlFor="submission-title" className="form-label">
              Titre de la communication scientifique
            </label>
            <input
              id="submission-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field text-sm sm:text-base font-medium"
              placeholder="ex. Optimisation quantique des réseaux distribués..."
              required
            />
          </div>

          <div>
            <label htmlFor="submission-coauthors" className="form-label flex items-center gap-1.5">
              <UserPlusIcon size={15} className="text-accent-ink" />
              <span>Co-auteurs & Affiliations (Optionnel)</span>
            </label>
            <input
              id="submission-coauthors"
              type="text"
              value={coauthors}
              onChange={(e) => setCoauthors(e.target.value)}
              className="input-field text-xs sm:text-sm"
              placeholder="ex. Dr. A. Cherif (USTO-MB), Pr. Y. Mansouri (Univ. Oran 1)"
            />
            <p className="form-hint">Séparez les co-auteurs par des virgules.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="submission-abstract" className="form-label mb-0">
                Résumé scientifique (Abstract)
              </label>
              <span className={`text-xs num ${wordStatus}`}>
                {n} mot{n > 1 ? 's' : ''} (150 à 500 conseillés)
              </span>
            </div>
            <textarea
              id="submission-abstract"
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              className="textarea-field text-sm leading-relaxed"
              rows={8}
              placeholder="Présentez la problématique de recherche, la méthodologie proposée, les expérimentations et les résultats majeurs..."
              required
            />
          </div>

          {/* Mots-clés thématiques */}
          <div>
            <label className="form-label flex items-center gap-1.5">
              <SparkleIcon size={14} className="text-accent-ink" />
              <span>Mots-clés thématiques (Matching IA)</span>
            </label>

            {/* Suggestions en un clic */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {SUGGESTED_KEYWORDS.map((sk) => (
                <button
                  key={sk}
                  type="button"
                  onClick={() => addKeyword(sk)}
                  className="text-xs px-2.5 py-0.5 rounded-lg border border-line bg-surface hover:border-accent/50 hover:bg-accent/10 hover:text-accent-ink transition-colors text-muted"
                >
                  + {sk}
                </button>
              ))}
            </div>

            {/* Saisie libre de tags */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-line bg-surface min-h-11">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/15 text-accent-ink text-xs font-medium"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeKeyword(kw)}
                    className="hover:text-bad font-bold ml-0.5"
                    aria-label={`Retirer ${kw}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeyDownKeyword}
                placeholder={keywords.length === 0 ? "Tapez un mot-clé puis 'Entrée'…" : "Ajouter un autre mot-clé…"}
                className="flex-1 bg-transparent text-xs text-fg focus:outline-none min-w-[160px] py-1"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Mode Prévisualisation Preprint */
        <div className="space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl border border-line/80 bg-surface-2/30 space-y-4 border-l-4 border-l-accent">
            <span className="text-[11px] font-mono text-accent-ink uppercase tracking-wider block font-semibold">
              Aperçu officiel avant dépôt
            </span>
            <h4 className="text-lg sm:text-xl font-bold tracking-tight text-fg">
              {title || 'Titre de votre article non renseigné'}
            </h4>
            {coauthors && (
              <p className="text-xs text-muted font-medium">
                Co-auteurs : {coauthors}
              </p>
            )}
            <div className="pt-2 border-t border-line/50">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">
                Résumé
              </span>
              <p className="text-sm sm:text-base leading-relaxed text-fg/90 whitespace-pre-line max-w-prose">
                {abstract || 'Rédigez votre résumé dans l’onglet Édition pour le visualiser ici.'}
              </p>
            </div>
            {keywords.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                <span className="text-xs font-semibold text-muted">Mots-clés :</span>
                {keywords.map((k) => (
                  <span key={k} className="text-xs font-mono text-accent-ink bg-accent/10 px-2 py-0.5 rounded">
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-muted italic">
            Les évaluateurs recevront cette mise en page pour rendre leurs avis et notes scientifiques.
          </p>
        </div>
      )}

      {error && (
        <div role="alert" className="alert-error">
          {error}
        </div>
      )}

      <div className="pt-2 flex items-center justify-between gap-3">
        <button type="submit" disabled={submitting || !title.trim() || !abstract.trim()} className="btn-primary">
          <CheckIcon size={16} weight="bold" aria-hidden="true" />
          {submitting ? 'Dépôt en cours…' : "Confirmer & Soumettre l'article"}
        </button>
        <span className="text-xs text-faint">Validation immédiate par horodatage</span>
      </div>
    </form>
  )
}
