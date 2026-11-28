import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { XIcon, SparkleIcon, PaperPlaneRightIcon } from '@phosphor-icons/react'
import { useLanguage } from '../../context/LanguageContext'
import { askRag } from '../../services/aiApi'

export default function FloatingEventAssistant({ event }) {
  const { lang, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [bottomPx, setBottomPx] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 1024 ? 80 : 24,
  )

  useEffect(() => {
    let rafId = null
    const updatePosition = () => {
      rafId = null
      const baseBottom = window.innerWidth < 1024 ? 80 : 24
      const footer = document.querySelector('footer')
      if (!footer) {
        setBottomPx(baseBottom)
        return
      }
      const rect = footer.getBoundingClientRect()
      const footerVisible = Math.max(0, window.innerHeight - rect.top)
      setBottomPx(footerVisible > 0 ? Math.max(baseBottom, Math.round(footerVisible + 16)) : baseBottom)
    }
    const onScrollOrResize = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(updatePosition)
      }
    }
    updatePosition()
    window.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize, { passive: true })
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [])

  useEffect(() => {
    setQuery('')
    setError(null)
    setResult(null)
  }, [event?.id])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!event) return null

  const submitQuestion = async (questionText) => {
    if (loading) return
    const clean = (questionText ?? query).trim()
    if (!clean) return
    setQuery(clean)
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const data = await askRag({
        query: clean,
        scope: 'event',
        eventId: String(event.id),
        lang,
      })
      setError(null)
      setResult(data)
    } catch (err) {
      setResult(null)
      setError(err.message || t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  const starters = [
    t('rag.starterFees'),
    t('rag.starterDates'),
    t('rag.starterAccepted'),
  ]

  const content = (
    <div
      style={{ bottom: `${bottomPx}px` }}
      className="fixed end-4 sm:end-6 z-40 flex flex-col items-end gap-3"
    >
      {open && (
        <section
          role="dialog"
          aria-label={t('rag.eventCatchphrase')}
          className="w-[min(92vw,420px)] max-h-[75vh] overflow-y-auto rounded-2xl border border-accent/40 dark:border-accent/35 bg-surface p-5 space-y-4 shadow-[0_0_28px_-6px_rgba(200,150,62,0.22)] dark:shadow-[0_0_32px_-6px_rgba(196,168,107,0.20)] animate-modal-enter"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex items-center gap-2">
              <SparkleIcon size={17} weight="fill" className="text-accent-ink shrink-0" aria-hidden="true" />
              <h3 className="text-sm font-semibold tracking-tight text-fg leading-snug">
                {t('rag.eventCatchphrase')}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-ghost btn-sm p-1 text-muted hover:text-fg shrink-0 cursor-pointer"
              aria-label={t('common.close')}
            >
              <XIcon size={16} />
            </button>
          </div>

          {/* Input bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitQuestion()
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={query}
              disabled={loading}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('rag.eventPlaceholder')}
              aria-label={t('rag.eventCatchphrase')}
              className="input-field flex-1 h-10 text-sm focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-accent hover:bg-accent/90 text-[#1D1D1F] font-semibold text-xs rounded-xl px-3.5 h-10 shrink-0 inline-flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <PaperPlaneRightIcon size={14} weight="bold" className="rtl:rotate-180" aria-hidden="true" />
              <span>{loading ? t('rag.asking') : t('rag.askBtn')}</span>
            </button>
          </form>

          {/* 3 clickable starter chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted me-0.5">{t('rag.tryAsking')}</span>
            {starters.map((starter) => (
              <button
                key={starter}
                type="button"
                disabled={loading}
                onClick={() => submitQuestion(starter)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-surface-2 border border-line text-fg hover:border-accent/60 hover:text-accent-ink transition-colors cursor-pointer disabled:opacity-50"
              >
                {starter}
              </button>
            ))}
          </div>

          {error && <div className="alert-error text-xs">{error}</div>}

          {loading && (
            <div className="space-y-2 border-s-4 border-accent ps-3.5 py-1.5">
              <div className="skeleton h-3.5 w-4/5" />
              <div className="skeleton h-3.5 w-2/3" />
            </div>
          )}

          {!loading && result && (
            <div className="max-h-56 overflow-y-auto border-s-4 border-accent ps-3.5 py-2 pe-2 rounded-e-xl bg-surface-2/60 space-y-2.5 animate-panel-enter">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs sm:text-sm text-fg leading-relaxed whitespace-pre-line">{result.answer}</p>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="btn-ghost btn-sm p-1 text-muted hover:text-fg shrink-0 cursor-pointer"
                  aria-label={t('common.close')}
                >
                  <XIcon size={14} />
                </button>
              </div>
              {result.citations?.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-medium text-muted me-1">{t('rag.sources')}:</span>
                  {result.citations.map((cit, idx) => (
                    <span
                      key={`${cit.title}-${idx}`}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-100/80 text-neutral-700 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
                      <span className="truncate max-w-[200px]">{cit.title}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Floating Trigger Pill */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent hover:bg-accent/90 text-[#1D1D1F] font-semibold text-xs sm:text-sm shadow-[0_0_24px_-4px_rgba(200,150,62,0.45)] dark:shadow-[0_0_24px_-4px_rgba(196,168,107,0.35)] transition-all active:scale-95 cursor-pointer"
      >
        <SparkleIcon size={16} weight="fill" aria-hidden="true" />
        <span>{t('rag.eventButton')}</span>
      </button>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content
}
