import { useState } from 'react'
import { SparkleIcon, EyeIcon, NotePencilIcon, CheckIcon, UserPlusIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { useLanguage } from '../../context/LanguageContext'
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
  const { t } = useLanguage()
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
          <h3 className="text-lg font-semibold tracking-tight text-fg">{t('submissions.submitArticle')}</h3>
          <p className="text-xs text-muted mt-0.5">
            {t('submissionForm.subtitle')}
          </p>
        </div>

        {/* Commutateur Édition / Aperçu Preprint */}
        <div className="flex items-center rounded-xl border border-line bg-surface/80 p-0.5 shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setPreviewMode(false)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              !previewMode ? 'bg-surface text-fg font-semibold shadow-xs ring-1 ring-line' : 'text-muted hover:text-fg'
            }`}
          >
            <NotePencilIcon size={14} />
            {t('submissionForm.editTab')}
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode(true)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              previewMode ? 'bg-surface text-fg font-semibold shadow-xs ring-1 ring-line' : 'text-muted hover:text-fg'
            }`}
          >
            <EyeIcon size={14} />
            {t('submissionForm.previewTab')}
          </button>
        </div>
      </div>

      {!previewMode ? (
        <div className="space-y-5">
          <div>
            <label htmlFor="submission-title" className="form-label">
              {t('submissions.title')}
            </label>
            <input
              id="submission-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field text-sm sm:text-base font-medium"
              placeholder={t('submissionForm.titlePlaceholder')}
              required
            />
          </div>

          <div>
            <label htmlFor="submission-coauthors" className="form-label flex items-center gap-1.5">
              <UserPlusIcon size={15} className="text-accent-ink" />
              <span>
                {t('submissionForm.coauthorsLabel')} ({t('common.optional')})
              </span>
            </label>
            <input
              id="submission-coauthors"
              type="text"
              value={coauthors}
              onChange={(e) => setCoauthors(e.target.value)}
              className="input-field text-xs sm:text-sm"
              placeholder={t('submissionForm.coauthorsPlaceholder')}
            />
            <p className="form-hint">{t('submissionForm.coauthorsHint')}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="submission-abstract" className="form-label mb-0">
                {t('submissions.abstract')}
              </label>
              <span className={`text-xs num ${wordStatus}`}>
                {t(n > 1 ? 'submissionForm.wordCountPlural' : 'submissionForm.wordCountSingle', { count: n })}
              </span>
            </div>
            <textarea
              id="submission-abstract"
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              className="textarea-field text-sm leading-relaxed"
              rows={8}
              placeholder={t('submissionForm.abstractPlaceholder')}
              required
            />
          </div>

          {/* Mots-clés thématiques */}
          <div>
            <label className="form-label flex items-center gap-1.5">
              <SparkleIcon size={14} className="text-accent-ink" />
              <span>{t('submissions.keywords')}</span>
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
                    className="hover:text-bad font-bold ms-0.5"
                    aria-label={`${t('submissionForm.removeKeyword')} ${kw}`}
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
                placeholder={
                  keywords.length === 0
                    ? t('submissionForm.keywordPlaceholderEmpty')
                    : t('submissionForm.keywordPlaceholderMore')
                }
                className="flex-1 bg-transparent text-xs text-fg focus:outline-none min-w-[160px] py-1"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Mode Prévisualisation Preprint */
        <div className="space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl border border-line/80 bg-surface-2/30 space-y-4 border-s-4 border-s-accent">
            <span className="text-[11px] font-mono text-accent-ink uppercase tracking-wider block font-semibold">
              {t('submissionForm.previewBanner')}
            </span>
            <h4 className="text-lg sm:text-xl font-bold tracking-tight text-fg">
              {title || t('submissionForm.titleMissing')}
            </h4>
            {coauthors && (
              <p className="text-xs text-muted font-medium">
                {t('submissionForm.coauthorsPrefix')} {coauthors}
              </p>
            )}
            <div className="pt-2 border-t border-line/50">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">
                {t('submissions.abstract')}
              </span>
              <p className="text-sm sm:text-base leading-relaxed text-fg/90 whitespace-pre-line max-w-prose">
                {abstract || t('submissionForm.abstractMissing')}
              </p>
            </div>
            {keywords.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                <span className="text-xs font-semibold text-muted">{t('submissions.keywords')} :</span>
                {keywords.map((k) => (
                  <span key={k} className="text-xs font-mono text-accent-ink bg-accent/10 px-2 py-0.5 rounded">
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-muted italic">
            {t('submissionForm.previewNote')}
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
          {submitting
            ? t('submissionForm.submitting')
            : t('submissionForm.submitBtn')}
        </button>
        <span className="text-xs text-faint">{t('submissionForm.timestampNote')}</span>
      </div>
    </form>
  )
}
