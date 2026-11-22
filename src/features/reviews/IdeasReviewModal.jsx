import { useState, useEffect, useId } from 'react'
import {
  XIcon,
  CheckCircleIcon,
  StarIcon,
  ShieldCheckIcon,
  BookBookmarkIcon,
  TrophyIcon,
  FilePdfIcon,
  FloppyDiskIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  EyeSlashIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { writeError } from '../../lib/errors'
import {
  FORM_STORAGE_KEY_PREFIX,
  A1_OPTIONS,
  B3_OPTIONS,
  C2_OPTIONS,
  C3_TRACKS,
  C4_OPTIONS,
  D1_OPTIONS,
  D2_OPTIONS,
  D3_OPTIONS,
  F1_OPTIONS,
  F2_FORMATS,
  F3_OPTIONS,
  TABS,
  serializeReviewToComments,
} from './ideasReviewUtils'

function StarRating({ value, onChange, label, desc }) {
  return (
    <div className="space-y-1.5 p-3 rounded-xl border border-line/60 bg-surface/50">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-fg">{label}</label>
        <span className="text-xs font-mono font-bold text-accent-ink">{value} / 5</span>
      </div>
      {desc && <p className="text-[11px] text-muted">{desc}</p>}
      <div className="grid grid-cols-5 gap-1 pt-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value >= n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                value === n
                  ? 'bg-accent/20 border-accent text-fg font-bold shadow-xs'
                  : active
                    ? 'bg-accent/10 border-accent/40 text-fg'
                    : 'bg-surface border-line text-muted hover:border-fg/30'
              }`}
            >
              <StarIcon size={12} weight={active ? 'fill' : 'regular'} className={active ? 'text-accent' : 'text-faint'} />
              <span>{n}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function IdeasReviewModal({
  submission,
  eventId,
  initialData = null,
  onClose,
  onReviewed,
}) {
  const { user } = useAuth()
  const formId = useId()
  const storageKey = `${FORM_STORAGE_KEY_PREFIX}${submission.id}_${user?.id || 'anon'}`

  const [tab, setTab] = useState('ab')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [draftSaved, setDraftSaved] = useState(false)

  const [formData, setFormData] = useState(() => {
    if (initialData) return initialData
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return {
      a1: 'expert',
      b1: 4,
      b2: 4,
      b3: 'experiments',
      b4: 4,
      b5: 4,
      c1: 4,
      c2: 'highly_relevant',
      c3: 'ai_ml',
      c4: 'fully_compliant',
      d1: 'yes',
      d2: 'yes',
      d3: 'no_concerns',
      e1: '',
      e2: '',
      e3: '',
      e4: '',
      f1: 'accept',
      f2: 'oral',
      f3: 'strongly',
      f4: 'no',
      f5: 85,
      sessionId: '',
    }
  })

  const [sessions, setSessions] = useState([])

  useEffect(() => {
    if (!eventId) return
    supabase
      .from('sessions')
      .select('id, title')
      .eq('event_id', eventId)
      .order('title', { ascending: true })
      .then(({ data }) => setSessions(data || []))
  }, [eventId])

  // Charger les notes confidentielles chaires si une évaluation existe déjà
  useEffect(() => {
    if (!user?.id || !submission?.id) return
    supabase
      .from('reviews')
      .select('id')
      .eq('submission_id', submission.id)
      .eq('reviewer_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.id) {
          supabase
            .from('review_chair_notes')
            .select('notes')
            .eq('review_id', data.id)
            .maybeSingle()
            .then(({ data: noteData }) => {
              if (noteData?.notes) {
                setFormData((prev) => ({ ...prev, e4: noteData.notes }))
              }
            })
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [submission?.id, user?.id])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(formData))
      setDraftSaved(true)
      const timer = setTimeout(() => setDraftSaved(false), 2000)
      return () => clearTimeout(timer)
    } catch {
      // ignore
    }
  }, [formData, storageKey])

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const calculateFiveStarScore = (f5Score) => {
    const s = Number(f5Score) || 75
    if (s >= 90) return 5
    if (s >= 75) return 4
    if (s >= 60) return 3
    if (s >= 40) return 2
    return 1
  }

  const mapRecommendationToDb = (f1) => {
    if (f1 === 'accept') return 'accept'
    if (f1 === 'accept_minor' || f1 === 'major_revision') return 'revise'
    return 'reject'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!formData.e1.trim()) {
      setError('Veuillez renseigner au moins les points forts (E1) pour les auteurs.')
      setTab('ef')
      return
    }

    setSubmitting(true)
    const fullComments = serializeReviewToComments(formData)
    const score5 = calculateFiveStarScore(formData.f5)
    const dbRecommendation = mapRecommendationToDb(formData.f1)

    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('submission_id', submission.id)
      .eq('reviewer_id', user.id)
      .maybeSingle()

    let submitError
    let targetReviewId = existing?.id

    if (existing?.id) {
      const updateRes = await supabase
        .from('reviews')
        .update({
          score: score5,
          comments: fullComments,
          recommendation: dbRecommendation,
          recommended_session_id: dbRecommendation === 'accept' && formData.sessionId ? formData.sessionId : null,
        })
        .eq('id', existing.id)
        .select('id')
      submitError = writeError(updateRes, 'Enregistrement de l’évaluation refusé.')
    } else {
      const insertRes = await supabase
        .from('reviews')
        .insert({
          submission_id: submission.id,
          reviewer_id: user.id,
          score: score5,
          comments: fullComments,
          recommendation: dbRecommendation,
          recommended_session_id: dbRecommendation === 'accept' && formData.sessionId ? formData.sessionId : null,
        })
        .select('id')
      submitError = writeError(insertRes, 'Enregistrement de l’évaluation refusé.')
      if (!submitError && insertRes.data?.[0]?.id) {
        targetReviewId = insertRes.data[0].id
      }
    }

    if (submitError) {
      setSubmitting(false)
      setError(submitError)
      return
    }

    // Enregistrement des remarques confidentielles dans la table dédiée sécurisée
    if (targetReviewId) {
      const cleanE4 = formData.e4?.trim()
      try {
        if (cleanE4) {
          const { error: notesErr } = await supabase
            .from('review_chair_notes')
            .upsert({
              review_id: targetReviewId,
              notes: cleanE4,
              updated_at: new Date().toISOString(),
            })
          if (notesErr) {
            console.warn('Notes confidentielles non enregistrées (vérifier 003_review_confidential_notes.sql) :', notesErr.message)
          }
        } else {
          await supabase
            .from('review_chair_notes')
            .delete()
            .eq('review_id', targetReviewId)
        }
      } catch (err) {
        console.warn('Accès review_chair_notes impossible :', err)
      }
    }

    setSubmitting(false)

    try {
      localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }

    onReviewed?.()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formId}-title`}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-fade-in"
    >
      <div className="w-full max-w-4xl max-h-[94vh] bg-surface border border-line rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <header className="p-4 sm:p-5 border-b border-line bg-surface flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full bg-accent/15 text-accent-ink border border-accent/30">
                IDEAS’2027 Review Form
              </span>
              <span className="text-xs text-muted">Grille officielle d’évaluation par les pairs</span>
            </div>
            <h2 id={`${formId}-title`} className="text-base sm:text-lg font-semibold text-fg mt-1 truncate max-w-2xl">
              {submission.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {submission.file_url && (
              <a
                href={submission.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline btn-sm text-xs inline-flex items-center gap-1.5"
                title="Consulter le PDF de l'article"
              >
                <FilePdfIcon size={14} className="text-bad" />
                <span className="hidden sm:inline">Consulter PDF</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="icon-btn"
              aria-label="Fermer la grille d'évaluation"
            >
              <XIcon size={18} />
            </button>
          </div>
        </header>

        {/* Tab Switcher */}
        <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-line/60 bg-surface-2/40 flex items-center justify-between gap-2 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {TABS.map((t) => {
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all text-left ${
                    active
                      ? 'bg-fg text-surface font-semibold shadow-xs'
                      : 'text-muted hover:text-fg hover:bg-fg/5'
                  }`}
                >
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>

          <div className="text-[11px] text-muted flex items-center gap-1 shrink-0">
            <FloppyDiskIcon size={12} className={draftSaved ? 'text-ok' : 'text-faint'} />
            <span className="hidden sm:inline">{draftSaved ? 'Brouillon auto-sauvegardé' : 'Auto-sauvegarde active'}</span>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form id={formId} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {error && (
            <div role="alert" className="alert-error text-xs">
              {error}
            </div>
          )}

          {/* TAB 1: Sections A & B */}
          {tab === 'ab' && (
            <div className="space-y-6 animate-fade-in">
              {/* Section A */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-bold uppercase tracking-wider text-accent-ink mb-1 flex items-center gap-1.5">
                  <span>Section A: Reviewer profile</span>
                </legend>
                <div className="p-3.5 rounded-xl border border-line bg-surface-2/30 space-y-2">
                  <label className="text-xs font-semibold text-fg block">
                    A1. Your confidence in evaluating this paper
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {A1_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-0.5 text-left ${
                          formData.a1 === opt.value
                            ? 'bg-accent/15 border-accent text-fg shadow-xs ring-1 ring-accent/30 font-medium'
                            : 'bg-surface border-line text-muted hover:border-fg/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="a1"
                            value={opt.value}
                            checked={formData.a1 === opt.value}
                            onChange={(e) => updateField('a1', e.target.value)}
                            className="text-accent"
                          />
                          <span className="text-xs font-semibold text-fg">{opt.label}</span>
                        </div>
                        <span className="text-[10px] text-muted pl-5">{opt.hint}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </fieldset>

              {/* Section B */}
              <fieldset className="space-y-3 pt-2">
                <legend className="text-xs font-bold uppercase tracking-wider text-accent-ink mb-1 flex items-center gap-1.5">
                  <span>Section B: Scientific quality (scale 1 to 5: 5 = excellent, 1 = poor)</span>
                </legend>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <StarRating
                    label="B1. Originality"
                    desc="Does the paper contribute new ideas or findings?"
                    value={formData.b1}
                    onChange={(v) => updateField('b1', v)}
                  />
                  <StarRating
                    label="B2. Technical soundness"
                    desc="Are the methods correct and well explained?"
                    value={formData.b2}
                    onChange={(v) => updateField('b2', v)}
                  />
                </div>

                {/* B3 Validation */}
                <div className="p-3.5 rounded-xl border border-line bg-surface-2/30 space-y-2">
                  <label className="text-xs font-semibold text-fg block">
                    B3. Validation: are the results convincingly supported?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {B3_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`p-2 rounded-xl border cursor-pointer transition-all flex flex-col gap-0.5 text-left ${
                          formData.b3 === opt.value
                            ? 'bg-accent/15 border-accent text-fg shadow-xs ring-1 ring-accent/30 font-medium'
                            : 'bg-surface border-line text-muted hover:border-fg/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="b3"
                            value={opt.value}
                            checked={formData.b3 === opt.value}
                            onChange={(e) => updateField('b3', e.target.value)}
                            className="text-accent"
                          />
                          <span className="text-xs font-semibold text-fg">{opt.label}</span>
                        </div>
                        <span className="text-[10px] text-muted pl-5">{opt.hint}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <StarRating
                    label="B4. Conclusions"
                    desc="Are they supported by the presented results?"
                    value={formData.b4}
                    onChange={(v) => updateField('b4', v)}
                  />
                  <StarRating
                    label="B5. Related work"
                    desc="Is it properly cited and positioned against the state of the art?"
                    value={formData.b5}
                    onChange={(v) => updateField('b5', v)}
                  />
                </div>
              </fieldset>
            </div>
          )}

          {/* TAB 2: Sections C & D */}
          {tab === 'cd' && (
            <div className="space-y-6 animate-fade-in">
              {/* Section C */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-bold uppercase tracking-wider text-accent-ink mb-1 flex items-center gap-1.5">
                  <span>Section C: Presentation and fit</span>
                </legend>

                <StarRating
                  label="C1. Clarity and organization"
                  desc="Are objectives clearly stated, and is the paper well structured and easy to follow?"
                  value={formData.c1}
                  onChange={(v) => updateField('c1', v)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* C2 Relevance */}
                  <div className="p-3.5 rounded-xl border border-line bg-surface-2/30 space-y-2">
                    <label className="text-xs font-semibold text-fg block">
                      C2. Relevance to themes & audience
                    </label>
                    <div className="space-y-1.5">
                      {C2_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center gap-2 text-left ${
                            formData.c2 === opt.value
                              ? 'bg-accent/15 border-accent text-fg font-medium'
                              : 'bg-surface border-line text-muted hover:border-fg/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name="c2"
                            value={opt.value}
                            checked={formData.c2 === opt.value}
                            onChange={(e) => updateField('c2', e.target.value)}
                            className="text-accent"
                          />
                          <span className="text-xs">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* C3 Main Track */}
                  <div className="p-3.5 rounded-xl border border-line bg-surface-2/30 space-y-2">
                    <label className="text-xs font-semibold text-fg block">
                      C3. Main track of the paper
                    </label>
                    <div className="space-y-1.5">
                      {C3_TRACKS.map((trk) => (
                        <label
                          key={trk.value}
                          className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center gap-2 text-left ${
                            formData.c3 === trk.value
                              ? 'bg-accent/15 border-accent text-fg font-medium'
                              : 'bg-surface border-line text-muted hover:border-fg/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name="c3"
                            value={trk.value}
                            checked={formData.c3 === trk.value}
                            onChange={(e) => updateField('c3', e.target.value)}
                            className="text-accent"
                          />
                          <span className="text-xs">{trk.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* C4 Format compliance */}
                <div className="p-3.5 rounded-xl border border-line bg-surface-2/30 space-y-2">
                  <label className="text-xs font-semibold text-fg block">
                    C4. Format compliance (IEEE template, 6 pages limit, double-blind)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {C4_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`p-2 rounded-xl border cursor-pointer transition-all flex flex-col gap-0.5 text-left ${
                          formData.c4 === opt.value
                            ? 'bg-accent/15 border-accent text-fg font-medium ring-1 ring-accent/30'
                            : 'bg-surface border-line text-muted hover:border-fg/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="c4"
                            value={opt.value}
                            checked={formData.c4 === opt.value}
                            onChange={(e) => updateField('c4', e.target.value)}
                            className="text-accent"
                          />
                          <span className="text-xs font-semibold text-fg">{opt.label}</span>
                        </div>
                        <span className="text-[10px] text-muted pl-4.5">{opt.hint}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </fieldset>

              {/* Section D */}
              <fieldset className="space-y-3 pt-2">
                <legend className="text-xs font-bold uppercase tracking-wider text-accent-ink mb-1 flex items-center gap-1.5">
                  <ShieldCheckIcon size={14} className="text-accent-ink" />
                  <span>Section D: Responsible research (new for 2027)</span>
                </legend>

                {/* D1 Ethics */}
                <div className="p-3.5 rounded-xl border border-line bg-surface-2/30 space-y-2">
                  <label className="text-xs font-semibold text-fg block">
                    D1. Ethics and trustworthiness: data sources, privacy, bias & societal impact
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {D1_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center gap-2 text-left ${
                          formData.d1 === opt.value
                            ? 'bg-accent/15 border-accent text-fg font-medium'
                            : 'bg-surface border-line text-muted hover:border-fg/30'
                        }`}
                      >
                        <input
                          type="radio"
                          name="d1"
                          value={opt.value}
                          checked={formData.d1 === opt.value}
                          onChange={(e) => updateField('d1', e.target.value)}
                          className="text-accent"
                        />
                        <span className="text-xs">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* D2 Reproducibility */}
                <div className="p-3.5 rounded-xl border border-line bg-surface-2/30 space-y-2">
                  <label className="text-xs font-semibold text-fg block">
                    D2. Reproducibility: are datasets, code, parameters or protocols described well?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {D2_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center gap-2 text-left ${
                          formData.d2 === opt.value
                            ? 'bg-accent/15 border-accent text-fg font-medium'
                            : 'bg-surface border-line text-muted hover:border-fg/30'
                        }`}
                      >
                        <input
                          type="radio"
                          name="d2"
                          value={opt.value}
                          checked={formData.d2 === opt.value}
                          onChange={(e) => updateField('d2', e.target.value)}
                          className="text-accent"
                        />
                        <span className="text-xs">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* D3 Integrity concerns */}
                <div className="p-3.5 rounded-xl border border-line bg-surface-2/30 space-y-2">
                  <label className="text-xs font-semibold text-fg block">
                    D3. Integrity concerns: plagiarism, duplicate submission, undisclosed AI content?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {D3_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center gap-2 text-left ${
                          formData.d3 === opt.value
                            ? opt.value === 'possible_concern'
                              ? 'bg-bad/15 border-bad text-bad font-medium'
                              : 'bg-ok/15 border-ok text-ok font-medium'
                            : 'bg-surface border-line text-muted hover:border-fg/30'
                        }`}
                      >
                        <input
                          type="radio"
                          name="d3"
                          value={opt.value}
                          checked={formData.d3 === opt.value}
                          onChange={(e) => updateField('d3', e.target.value)}
                          className="text-accent"
                        />
                        <span className="text-xs font-semibold">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </fieldset>
            </div>
          )}

          {/* TAB 3: Sections E & F */}
          {tab === 'ef' && (
            <div className="space-y-6 animate-fade-in">
              {/* Section E */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-bold uppercase tracking-wider text-accent-ink mb-1 flex items-center gap-1.5">
                  <span>Section E: Detailed Comments</span>
                </legend>

                {/* E1 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor={`${formId}-e1`} className="text-xs font-semibold text-fg flex items-center gap-1">
                      <span>E1. Strengths</span>
                      <span className="text-[10px] text-ok bg-ok/10 px-1.5 py-0.2 rounded font-normal">Visible aux auteurs</span>
                    </label>
                    <span className="text-[11px] text-muted">Ce qui rend ce papier solide</span>
                  </div>
                  <textarea
                    id={`${formId}-e1`}
                    rows={3}
                    className="textarea-field text-xs"
                    placeholder="Points forts scientifiques, nouveauté, qualité des résultats..."
                    value={formData.e1}
                    onChange={(e) => updateField('e1', e.target.value)}
                    required
                  />
                </div>

                {/* E2 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor={`${formId}-e2`} className="text-xs font-semibold text-fg flex items-center gap-1">
                      <span>E2. Weaknesses</span>
                      <span className="text-[10px] text-ok bg-ok/10 px-1.5 py-0.2 rounded font-normal">Visible aux auteurs</span>
                    </label>
                    <span className="text-[11px] text-muted">Limites et faiblesses méthodologiques</span>
                  </div>
                  <textarea
                    id={`${formId}-e2`}
                    rows={3}
                    className="textarea-field text-xs"
                    placeholder="Manque de comparaisons, hypothèses non vérifiées, faiblesses..."
                    value={formData.e2}
                    onChange={(e) => updateField('e2', e.target.value)}
                  />
                </div>

                {/* E3 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor={`${formId}-e3`} className="text-xs font-semibold text-fg flex items-center gap-1">
                      <span>E3. Actionable suggestions for improvement</span>
                      <span className="text-[10px] text-ok bg-ok/10 px-1.5 py-0.2 rounded font-normal">Visible aux auteurs</span>
                    </label>
                    <span className="text-[11px] text-muted">Conseils concrets pour la version finale</span>
                  </div>
                  <textarea
                    id={`${formId}-e3`}
                    rows={3}
                    className="textarea-field text-xs"
                    placeholder="Expérimentations additionnelles suggérées, clarifications de preuves..."
                    value={formData.e3}
                    onChange={(e) => updateField('e3', e.target.value)}
                  />
                </div>

                {/* E4 Confidential */}
                <div className="p-3.5 rounded-xl border border-warn/40 bg-warn/5">
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor={`${formId}-e4`} className="text-xs font-semibold text-warn flex items-center gap-1">
                      <EyeSlashIcon size={14} />
                      <span>E4. Confidential comments to the chairs</span>
                      <span className="text-[10px] text-warn bg-warn/15 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                        Non visible aux auteurs
                      </span>
                    </label>
                  </div>
                  <p className="text-[11px] text-muted mb-2">
                    Remarques réservées exclusivement au comité de programme (doutes d'intégrité, réserve d'arbitrage).
                  </p>
                  <textarea
                    id={`${formId}-e4`}
                    rows={2}
                    className="textarea-field text-xs border-warn/30 focus:border-warn"
                    placeholder="Remarques confidentielles pour les présidents du colloque..."
                    value={formData.e4}
                    onChange={(e) => updateField('e4', e.target.value)}
                  />
                </div>
              </fieldset>

              {/* Section F */}
              <fieldset className="space-y-4 pt-2">
                <legend className="text-xs font-bold uppercase tracking-wider text-accent-ink mb-1 flex items-center gap-1.5">
                  <span>Section F: Recommendation & Decision</span>
                </legend>

                {/* F1 Decision */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-fg block">
                    F1. Decision recommendation
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {F1_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-0.5 text-left ${
                          formData.f1 === opt.value
                            ? `${opt.bg} ${opt.color} font-bold ring-1 ring-current`
                            : 'bg-surface border-line text-muted hover:border-fg/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="f1"
                            value={opt.value}
                            checked={formData.f1 === opt.value}
                            onChange={(e) => updateField('f1', e.target.value)}
                            className="text-accent"
                          />
                          <span className="text-xs font-bold">{opt.label}</span>
                        </div>
                        <span className="text-[10px] text-muted/90 pl-5">{opt.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* F2 Presentation format */}
                  <div className="p-3 rounded-xl border border-line bg-surface-2/30 space-y-1.5">
                    <label className="text-xs font-semibold text-fg block">
                      F2. Suggested presentation format
                    </label>
                    <div className="space-y-1">
                      {F2_FORMATS.map((fmt) => (
                        <label
                          key={fmt.value}
                          className={`p-1.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 text-left ${
                            formData.f2 === fmt.value
                              ? 'bg-accent/15 border-accent text-fg font-medium'
                              : 'bg-surface border-line text-muted hover:border-fg/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name="f2"
                            value={fmt.value}
                            checked={formData.f2 === fmt.value}
                            onChange={(e) => updateField('f2', e.target.value)}
                            className="text-accent"
                          />
                          <span className="text-xs">{fmt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* F3 Book Chapter */}
                  <div className="p-3 rounded-xl border border-line bg-surface-2/30 space-y-1.5">
                    <label className="text-xs font-semibold text-fg flex items-center gap-1.5">
                      <BookBookmarkIcon size={14} className="text-accent-ink" />
                      <span>F3. Book chapter potential (IGI Global)</span>
                    </label>
                    <div className="space-y-1">
                      {F3_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className={`p-1.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 text-left ${
                            formData.f3 === opt.value
                              ? 'bg-accent/15 border-accent text-fg font-medium'
                              : 'bg-surface border-line text-muted hover:border-fg/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name="f3"
                            value={opt.value}
                            checked={formData.f3 === opt.value}
                            onChange={(e) => updateField('f3', e.target.value)}
                            className="text-accent"
                          />
                          <span className="text-xs">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* F4 Best Paper Nomination */}
                <div className="p-3.5 rounded-xl border border-accent/40 bg-accent/5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent-ink flex items-center justify-center shrink-0">
                      <TrophyIcon size={18} weight="fill" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-fg block">
                        F4. Best Paper Award nomination
                      </span>
                      <span className="text-[11px] text-muted">
                        Proposer cet article pour le prix du meilleur papier de la conférence
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateField('f4', 'no')}
                      className={`px-3 py-1 rounded-lg border text-xs font-medium ${
                        formData.f4 === 'no'
                          ? 'bg-surface text-fg border-fg/30 font-bold'
                          : 'text-muted border-line hover:border-fg/20'
                      }`}
                    >
                      Non
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('f4', 'yes')}
                      className={`px-3 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 ${
                        formData.f4 === 'yes'
                          ? 'bg-accent text-on-accent border-accent font-bold shadow-xs'
                          : 'text-muted border-line hover:border-accent/40'
                      }`}
                    >
                      <TrophyIcon size={12} weight="fill" />
                      <span>Nominer</span>
                    </button>
                  </div>
                </div>

                {/* F5 Overall Score 1-100 */}
                <div className="p-4 rounded-xl border border-line bg-surface-2/40 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <label htmlFor={`${formId}-f5`} className="text-xs font-bold text-fg block">
                        F5. Overall score (scale 1 to 100)
                      </label>
                      <span className="text-[11px] text-muted">
                        Évaluation synthétique globale
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold font-mono text-accent-ink">{formData.f5}</span>
                      <span className="text-xs text-muted"> / 100</span>
                    </div>
                  </div>

                  <input
                    id={`${formId}-f5`}
                    type="range"
                    min="1"
                    max="100"
                    value={formData.f5}
                    onChange={(e) => updateField('f5', Number(e.target.value))}
                    className="w-full accent-accent cursor-pointer"
                  />

                  {/* Reference bands */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 pt-1 text-[10px]">
                    <div className={`p-1 rounded text-center border ${formData.f5 >= 90 ? 'bg-ok/20 border-ok text-ok font-bold' : 'border-line text-muted'}`}>
                      90-100: outstanding
                    </div>
                    <div className={`p-1 rounded text-center border ${formData.f5 >= 75 && formData.f5 < 90 ? 'bg-info/20 border-info text-info font-bold' : 'border-line text-muted'}`}>
                      75-89: strong, accept
                    </div>
                    <div className={`p-1 rounded text-center border ${formData.f5 >= 60 && formData.f5 < 75 ? 'bg-accent/20 border-accent text-accent-ink font-bold' : 'border-line text-muted'}`}>
                      60-74: revisions
                    </div>
                    <div className={`p-1 rounded text-center border ${formData.f5 >= 40 && formData.f5 < 60 ? 'bg-warn/20 border-warn text-warn font-bold' : 'border-line text-muted'}`}>
                      40-59: weaknesses
                    </div>
                    <div className={`p-1 rounded text-center border ${formData.f5 < 40 ? 'bg-bad/20 border-bad text-bad font-bold' : 'border-line text-muted'}`}>
                      &lt; 40: reject
                    </div>
                  </div>
                </div>

                {/* Session assign suggestion if accept */}
                {sessions.length > 0 && formData.f1 === 'accept' && (
                  <div>
                    <label htmlFor={`${formId}-session`} className="text-xs font-semibold text-fg block mb-1">
                      Session thématique recommandée (optionnel)
                    </label>
                    <select
                      id={`${formId}-session`}
                      className="select-field text-xs"
                      value={formData.sessionId}
                      onChange={(e) => updateField('sessionId', e.target.value)}
                    >
                      <option value="">-- Choisir une session --</option>
                      {sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </fieldset>
            </div>
          )}
        </form>

        {/* Sticky Footer */}
        <footer className="p-4 sm:p-5 border-t border-line bg-surface flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {tab !== 'ab' && (
              <button
                type="button"
                onClick={() => setTab(tab === 'ef' ? 'cd' : 'ab')}
                className="btn-ghost btn-sm text-xs inline-flex items-center gap-1"
              >
                <ArrowLeftIcon size={12} />
                <span>Précédent</span>
              </button>
            )}
            {tab !== 'ef' && (
              <button
                type="button"
                onClick={() => setTab(tab === 'ab' ? 'cd' : 'ef')}
                className="btn-outline btn-sm text-xs inline-flex items-center gap-1"
              >
                <span>Suivant</span>
                <ArrowRightIcon size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost btn-sm text-xs"
            >
              Annuler
            </button>
            <button
              type="submit"
              form={formId}
              disabled={submitting}
              className="btn-primary btn-sm text-xs inline-flex items-center gap-1.5 min-h-9"
            >
              {submitting ? (
                <span>Enregistrement…</span>
              ) : (
                <>
                  <CheckCircleIcon size={14} weight="bold" />
                  <span>Soumettre l’évaluation IDEAS'2027</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
