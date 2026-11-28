import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  MagnifyingGlassIcon,
  BooksIcon,
  FileTextIcon,
  QuotesIcon,
  ArrowUpRightIcon,
  CheckIcon,
  CopyIcon,
  CalendarBlankIcon,
  MapPinIcon,
  CaretDownIcon,
  CaretUpIcon,
  ArrowCounterClockwiseIcon,
  PresentationChartIcon,
  EyeIcon,
  ArrowsOutIcon,
  XIcon,
  SparkleIcon,
  PaperPlaneRightIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useLanguage } from '../../context/LanguageContext'
import { useUrlQueryState } from '../../hooks/useUrlQueryState'
import { useModalBehavior } from '../../hooks/useModalBehavior'
import { askRag } from '../../services/aiApi'
import { TYPE_LABELS, FORMAT_LABELS } from '../../lib/constants'
import { cleanDescription } from '../../lib/cover'
import EventCover from '../../components/ui/EventCover'

function generateBibtex(article, event, t) {
  const words = (article.profiles?.full_name || '')
    .replace(/\s*\([^)]*\)/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.toLowerCase().replace(/[^a-z]/g, ''))
    .filter(Boolean)
  const authorLastName = words.length ? words[words.length - 1] : 'author'
  const year = event.start_date ? event.start_date.slice(0, 4) : '2026'
  const citeKey = `${authorLastName}_${year}:${article.id.slice(0, 6)}`

  return `@inproceedings{${citeKey},
  title        = {${article.title.replace(/[{}]/g, '')}},
  author       = {${article.profiles?.full_name || t('archives.bibtexAuthorFallback')}},
  booktitle    = {${t('archives.bibtexBooktitlePrefix')} ${event.title.replace(/[{}]/g, '')}},
  year         = {${year}},
  organization = {${t('archives.bibtexOrganization')}},
  address      = {${(event.location || t('archives.bibtexAddressFallback')).replace(/[{}]/g, '')}},
  publisher    = {${t('archives.bibtexPublisher')}}
}`
}

let cachedArchives = null

export default function ArchivesPage({ onOpenEvent }) {
  const { lang, locale, t } = useLanguage()
  const [searchParams, setSearchParams] = useUrlQueryState()
  const rawTab = searchParams.get('tab')
  const activeTab = rawTab === 'papers' ? 'papers' : rawTab === 'posters' ? 'posters' : 'proceedings'
  const setActiveTab = useCallback(
    (nextTab) => {
      const urlTab = nextTab === 'proceedings' ? 'editions' : nextTab
      setSearchParams((prev) => {
        prev.set('page', 'archives')
        prev.set('tab', urlTab)
        return prev
      })
    },
    [setSearchParams],
  )
  const [events, setEvents] = useState(cachedArchives?.events || [])
  const [submissionsByEvent, setSubmissionsByEvent] = useState(cachedArchives?.submissionsByEvent || {})
  const [loading, setLoading] = useState(!cachedArchives)
  const [search, setSearch] = useState('')
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [expandedEvents, setExpandedEvents] = useState(new Set())
  const [copiedKey, setCopiedKey] = useState(null)
  const [previewPoster, setPreviewPoster] = useState(null)
  const [ragQuery, setRagQuery] = useState('')
  const [ragLoading, setRagLoading] = useState(false)
  const [ragError, setRagError] = useState(null)
  const [ragResult, setRagResult] = useState(null)
  const closePoster = useCallback(() => setPreviewPoster(null), [])
  useModalBehavior(Boolean(previewPoster), closePoster)

  const submitArchivesQuestion = async (questionText) => {
    if (ragLoading) return
    const clean = (questionText ?? ragQuery).trim()
    if (!clean) return
    setRagQuery(clean)
    setRagError(null)
    setRagResult(null)
    setRagLoading(true)
    try {
      const data = await askRag({ query: clean, scope: 'archives', lang })
      setRagError(null)
      setRagResult(data)
    } catch (err) {
      setRagResult(null)
      setRagError(err.message || t('errors.generic'))
    } finally {
      setRagLoading(false)
    }
  }

  const loadArchives = useCallback(async () => {
    if (!cachedArchives) setLoading(true)
    // Récupération des conférences closes ou archivées
    const { data: evData, error: evErr } = await supabase
      .from('events')
      .select('id, title, description, type, format, status, phase, start_date, end_date, location, organizer_id')
      .in('status', ['closed', 'archived'])
      .order('start_date', { ascending: false })

    if (evErr) {
      setLoading(false)
      return
    }

    const eventList = evData || []
    setEvents(eventList)

    if (eventList.length > 0) {
      const eventIds = eventList.map((e) => e.id)
      const { data: subsData } = await supabase
        .from('submissions')
        .select('id, title, abstract, status, event_id, profiles(full_name, email, affiliation)')
        .in('event_id', eventIds)
        .eq('status', 'accepted')

      const map = {}
      ;(subsData || []).forEach((s) => {
        if (!map[s.event_id]) map[s.event_id] = []
        map[s.event_id].push(s)
      })
      cachedArchives = { events: eventList, submissionsByEvent: map }
      setSubmissionsByEvent(map)
    } else {
      cachedArchives = { events: eventList, submissionsByEvent: {} }
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadArchives()
  }, [loadArchives])

  const years = useMemo(() => {
    const set = new Set()
    events.forEach((e) => {
      if (e.start_date) set.add(e.start_date.slice(0, 4))
    })
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [events])

  const totalAcceptedSubmissions = useMemo(() => {
    return Object.values(submissionsByEvent).reduce((acc, curr) => acc + curr.length, 0)
  }, [submissionsByEvent])

  const allPosters = useMemo(() => {
    const list = []
    events.forEach((ev) => {
      const subs = submissionsByEvent[ev.id] || []
      subs.forEach((s) => {
        list.push({ ...s, event: ev })
      })
    })
    return list
  }, [events, submissionsByEvent])

  const toggleExpand = (id) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const copyCitation = async (article, event) => {
    const bib = generateBibtex(article, event, t)
    try {
      await navigator.clipboard.writeText(bib)
      setCopiedKey(article.id)
      setTimeout(() => setCopiedKey(null), 2500)
    } catch {
      // Fallback
    }
  }

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const eventSubs = submissionsByEvent[e.id] || []
      const text = `${e.title} ${e.description || ''} ${e.location || ''} ${eventSubs.map((s) => `${s.title} ${s.profiles?.full_name || ''}`).join(' ')}`.toLowerCase()
      if (search.trim() && !text.includes(search.toLowerCase().trim())) {
        return false
      }
      if (selectedYear !== 'all' && (!e.start_date || !e.start_date.startsWith(selectedYear))) {
        return false
      }
      if (selectedType !== 'all' && e.type !== selectedType) {
        return false
      }
      return true
    })
  }, [events, submissionsByEvent, search, selectedYear, selectedType])

  const filteredPosters = useMemo(() => {
    return allPosters.filter((p) => {
      const q = search.trim().toLowerCase()
      const text = `${p.title} ${p.abstract || ''} ${p.profiles?.full_name || ''} ${p.event?.title || ''}`.toLowerCase()
      if (q && !text.includes(q)) return false
      if (selectedYear !== 'all' && (!p.event?.start_date || !p.event.start_date.startsWith(selectedYear))) return false
      if (selectedType !== 'all' && p.event?.type !== selectedType) return false
      return true
    })
  }, [allPosters, search, selectedYear, selectedType])

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-10 py-8 sm:py-12 space-y-8 animate-view-fade">
      {/* EN-TÊTE COMPACT */}
      <header className="space-y-3 max-w-4xl">
        <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.025em] text-fg leading-tight">
          {t('archives.title')}
        </h1>
        <p className="text-sm sm:text-base text-muted leading-relaxed max-w-[70ch]">
          {t('archives.subtitle')}
        </p>

        {/* Bandeau de métadonnées inline sobre */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-[13px] text-muted pt-1">
          <span className="font-medium text-fg">{t('archives.metaEditions', { count: events.length })}</span>
          <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">·</span>
          <span className="font-medium text-fg">{t('archives.metaPapers', { count: totalAcceptedSubmissions })}</span>
          <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">·</span>
          <span>{t('archives.metaIndexing')}</span>
        </div>
      </header>

      {/* SPOTLIGHT : ASK THE ARCHIVES (AU-DESSUS DES ONGLETS & FILTRES) */}
      <section
        aria-label={t('rag.archivesTitle')}
        className="rounded-2xl border border-accent/40 dark:border-accent/35 bg-surface p-5 sm:p-6 space-y-4 shadow-[0_0_28px_-6px_rgba(200,150,62,0.18)] dark:shadow-[0_0_32px_-6px_rgba(196,168,107,0.16)]"
      >
        <div className="flex items-center gap-2.5">
          <SparkleIcon size={18} weight="fill" className="text-accent-ink shrink-0" aria-hidden="true" />
          <h2 className="text-sm sm:text-base font-semibold tracking-tight text-fg">
            {t('rag.archivesTitle')}
          </h2>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submitArchivesQuestion()
          }}
          className="flex flex-col sm:flex-row sm:items-center gap-2.5"
        >
          <input
            type="text"
            value={ragQuery}
            disabled={ragLoading}
            onChange={(e) => setRagQuery(e.target.value)}
            placeholder={t('rag.archivesPlaceholder')}
            aria-label={t('rag.archivesTitle')}
            className="input-field flex-1 h-11 text-sm focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={ragLoading || !ragQuery.trim()}
            className="bg-accent hover:bg-accent/90 text-[#1D1D1F] font-semibold text-xs sm:text-sm rounded-xl px-5 h-11 shrink-0 inline-flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <PaperPlaneRightIcon size={14} weight="bold" className="rtl:rotate-180" aria-hidden="true" />
            <span>{ragLoading ? t('rag.asking') : t('rag.askBtn')}</span>
          </button>
        </form>

        {/* 3 starter prompt chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted me-0.5">{t('rag.tryAsking')}</span>
          {[
            t('rag.archivesStarterCount'),
            t('rag.archivesStarterTopics'),
            t('rag.archivesStarterEvents'),
          ].map((starter) => (
            <button
              key={starter}
              type="button"
              disabled={ragLoading}
              onClick={() => submitArchivesQuestion(starter)}
              className="text-xs font-medium px-3 py-1 rounded-full bg-surface-2 border border-line text-fg hover:border-accent/60 hover:text-accent-ink transition-colors cursor-pointer disabled:opacity-50"
            >
              {starter}
            </button>
          ))}
        </div>

        {ragError && <div className="alert-error text-xs">{ragError}</div>}

        {ragLoading && (
          <div className="space-y-2 border-s-4 border-accent ps-4 py-1.5">
            <div className="skeleton h-3.5 w-4/5" />
            <div className="skeleton h-3.5 w-2/3" />
          </div>
        )}

        {!ragLoading && ragResult && (
          <div className="border-s-4 border-accent ps-4 py-2 rounded-e-xl bg-surface-2/60 space-y-3 animate-panel-enter">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-fg leading-relaxed whitespace-pre-line">{ragResult.answer}</p>
              <button
                type="button"
                onClick={() => setRagResult(null)}
                className="btn-ghost btn-sm p-1 text-muted hover:text-fg shrink-0"
                aria-label={t('common.close')}
              >
                <XIcon size={15} />
              </button>
            </div>

            {ragResult.citations?.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-medium text-muted me-1">{t('rag.sources')}:</span>
                {ragResult.citations.map((cit, idx) => {
                  const matchedPaper = cit.paper_id
                    ? allPosters.find((p) => String(p.id) === String(cit.paper_id))
                    : null
                  const clickable = Boolean(matchedPaper || cit.event_id)
                  return (
                    <button
                      key={`${cit.paper_id || cit.title}-${idx}`}
                      type="button"
                      disabled={!clickable}
                      onClick={() => {
                        if (matchedPaper) setPreviewPoster(matchedPaper)
                        else if (cit.event_id) onOpenEvent(cit.event_id)
                      }}
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-neutral-100/80 text-neutral-700 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10 hover:border-accent/60 hover:text-accent-ink transition-colors cursor-pointer disabled:cursor-default"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
                      <span className="truncate max-w-[240px]">{cit.title}</span>
                      {clickable && <ArrowUpRightIcon size={11} weight="bold" className="rtl:rotate-180 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* COMMUTATEUR MAÎTRE : ÉDITIONS | ARTICLES PUBLIÉS | GALERIE DES POSTERS */}
      <div className="flex items-center justify-start pt-1">
        <div className="inline-flex items-center bg-surface-2 p-1 rounded-xl border border-line gap-1 max-w-full overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('proceedings')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'proceedings'
                ? 'bg-surface text-fg shadow-xs'
                : 'text-muted hover:text-fg'
            }`}
          >
            <BooksIcon size={15} weight={activeTab === 'proceedings' ? 'bold' : 'regular'} />
            <span>{t('archives.tabs.proceedings', { count: events.length })}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('papers')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'papers'
                ? 'bg-surface text-fg shadow-xs'
                : 'text-muted hover:text-fg'
            }`}
          >
            <FileTextIcon size={15} weight={activeTab === 'papers' ? 'bold' : 'regular'} />
            <span>{t('archives.tabs.publishedPapers', { count: allPosters.length })}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('posters')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'posters'
                ? 'bg-surface text-fg shadow-xs'
                : 'text-muted hover:text-fg'
            }`}
          >
            <PresentationChartIcon size={15} weight={activeTab === 'posters' ? 'bold' : 'regular'} />
            <span>{t('archives.tabs.posters', { count: allPosters.length })}</span>
          </button>
        </div>
      </div>

      {/* BARRE DE RECHERCHE ET FILTRES */}
      <section className="card p-4 sm:p-5 border-line bg-surface-2/60 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-center">
          {/* Champ recherche texte */}
          <div className="relative">
            <MagnifyingGlassIcon
              size={18}
              className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === 'proceedings'
                  ? t('archives.searchProceedingsPlaceholder')
                  : activeTab === 'papers'
                    ? t('archives.searchPapersPlaceholder')
                    : t('archives.searchPostersPlaceholder')
              }
              className="input-field ps-10 text-sm"
            />
          </div>

          {/* Filtre Format/Type */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="select-field text-xs h-10 w-full md:w-auto"
            aria-label={t('archives.filterByTypeAria')}
          >
            <option value="all">{t('archives.allTypes')}</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => {
              const typeKey = `eventCard.types.${v}`
              const typeLabel = t(typeKey)
              return (
                <option key={v} value={v}>
                  {typeLabel !== typeKey ? typeLabel : l}
                </option>
              )
            })}
          </select>

          {/* Années selector */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
            <button
              type="button"
              onClick={() => setSelectedYear('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                selectedYear === 'all'
                  ? 'bg-accent text-on-accent'
                  : 'bg-surface border border-line text-muted hover:text-fg'
              }`}
            >
              {t('archives.allYears')}
            </button>
            {years.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 font-mono transition-colors ${
                  selectedYear === yr
                    ? 'bg-accent text-on-accent'
                    : 'bg-surface border border-line text-muted hover:text-fg'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>

        {(search || selectedYear !== 'all' || selectedType !== 'all') && (
          <div className="flex items-center justify-between text-xs text-muted pt-1 border-t border-line/60">
            <span>
              {activeTab === 'proceedings'
                ? t(
                    filteredEvents.length > 1
                      ? 'archives.resultsCount.proceedingsPlural'
                      : 'archives.resultsCount.proceedingsSingular',
                    { count: filteredEvents.length }
                  )
                : activeTab === 'papers'
                  ? t(
                      filteredPosters.length > 1
                        ? 'archives.resultsCount.papersPlural'
                        : 'archives.resultsCount.papersSingular',
                      { count: filteredPosters.length }
                    )
                  : t(
                      filteredPosters.length > 1
                        ? 'archives.resultsCount.postersPlural'
                        : 'archives.resultsCount.postersSingular',
                      { count: filteredPosters.length }
                    )}
            </span>
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setSelectedYear('all')
                setSelectedType('all')
              }}
              className="text-accent-ink hover:underline inline-flex items-center gap-1 font-semibold"
            >
              <ArrowCounterClockwiseIcon size={12} weight="bold" />
              {t('archives.resetFilters')}
            </button>
          </div>
        )}
      </section>

      {/* VUE 1 : RECUEILS D'ACTES & VOLUMES (TEXTUEL & BIBTEX) */}
      {activeTab === 'proceedings' && (
        <div key="tab-proceedings" className="animate-panel-enter">
          {loading ? (
            <div className="space-y-6">
              <div className="skeleton h-48 rounded-2xl" />
              <div className="skeleton h-48 rounded-2xl" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="card p-12 text-center border-dashed space-y-3">
              <BooksIcon size={36} className="text-muted mx-auto" weight="thin" />
              <h3 className="text-base font-semibold text-fg">{t('archives.emptyProceedings.title')}</h3>
              <p className="text-xs sm:text-sm text-muted max-w-[50ch] mx-auto">
                {events.length === 0
                  ? t('archives.emptyProceedings.noEvents')
                  : t('archives.emptyProceedings.noMatches')}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredEvents.map((ev) => {
                const subs = submissionsByEvent[ev.id] || []
                const isExpanded = expandedEvents.has(ev.id)
                const year = ev.start_date ? ev.start_date.slice(0, 4) : '2026'

                return (
                  <article
                    key={ev.id}
                    className="card border border-line bg-surface overflow-hidden shadow-card transition-all duration-200 hover:border-accent/30"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr] gap-6 p-5 sm:p-7 items-start">
                      <div className="relative rounded-xl overflow-hidden border border-line/70">
                        <EventCover seed={ev.id} event={ev} className="h-36 sm:h-44 p-3 flex flex-col justify-between">
                          <div className="flex items-center justify-between gap-1 relative z-10">
                            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/40 text-white backdrop-blur-xs">
                              {year}
                            </span>
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-fg/20 text-white backdrop-blur-xs">
                              {ev.status === 'archived' ? t('eventCard.statuses.archived') : t('eventCard.statuses.closed')}
                            </span>
                          </div>
                          <div className="relative z-10 text-white">
                            <span className="text-xs font-semibold block">
                              {t(`eventCard.types.${ev.type}`) !== `eventCard.types.${ev.type}`
                                ? t(`eventCard.types.${ev.type}`)
                                : (TYPE_LABELS[ev.type] || ev.type)}
                            </span>
                            <span className="text-[11px] text-white/75 block">
                              {(t(`eventCard.formats.${ev.format}`) !== `eventCard.formats.${ev.format}`
                                ? t(`eventCard.formats.${ev.format}`)
                                : (FORMAT_LABELS[ev.format] || ev.format || '')
                              ).toLowerCase()}
                            </span>
                          </div>
                        </EventCover>
                      </div>

                      <div className="space-y-3 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-muted">
                            <span className="inline-flex items-center gap-1 font-mono">
                              <CalendarBlankIcon size={14} />
                              {ev.start_date
                                ? (ev.end_date && ev.end_date !== ev.start_date
                                  ? `${new Date(`${String(ev.start_date).slice(0, 10)}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' })} — ${new Date(`${String(ev.end_date).slice(0, 10)}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`
                                  : new Date(`${String(ev.start_date).slice(0, 10)}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }))
                                : '—'}
                            </span>
                            <span>&bull;</span>
                            <span className="inline-flex items-center gap-1">
                              <MapPinIcon size={14} />
                              {ev.location || t('dashboard.defaultLocation')}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onOpenEvent(ev.id)}
                            className="btn-ghost btn-sm text-xs font-semibold inline-flex items-center gap-1"
                            title={t('archives.viewFullSheetTitle')}
                          >
                            <span>{t('archives.officialSheet')}</span>
                            <ArrowUpRightIcon size={13} weight="bold" className="rtl:rotate-180" />
                          </button>
                        </div>

                        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-fg leading-snug">
                          {ev.title}
                        </h2>

                        {ev.description && (
                          <p className="text-xs sm:text-sm text-muted leading-relaxed line-clamp-2 max-w-[75ch]">
                            {cleanDescription(ev.description)}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line/60">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-neutral-100/80 text-neutral-700 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10">
                              {t('archives.proceedingsVol', { vol: `${year}-${ev.id.slice(0, 4).toUpperCase()}` })}
                            </span>
                            <span className="text-xs text-muted">
                              <strong>{subs.length}</strong>{' '}
                              {subs.length > 1 ? t('archives.validatedPaperPlural') : t('archives.validatedPaperSingular')}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleExpand(ev.id)}
                            className="btn-outline btn-sm text-xs font-semibold inline-flex items-center gap-1.5"
                          >
                            {isExpanded ? (
                              <>
                                <span>{t('archives.hideProceedings')}</span>
                                <CaretUpIcon size={13} weight="bold" />
                              </>
                            ) : (
                              <>
                                <FileTextIcon size={14} />
                                <span>{t('archives.viewProceedings', { count: subs.length })}</span>
                                <CaretDownIcon size={13} weight="bold" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-surface-2/70 border-t border-line p-5 sm:p-7 space-y-4 animate-view-fade">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                            <QuotesIcon size={14} className="text-accent-ink" weight="bold" />
                            {t('archives.tocTitle')}
                          </h3>
                          <span className="text-[11px] text-muted">{t('archives.tocSubtitle')}</span>
                        </div>

                        {subs.length === 0 ? (
                          <p className="text-xs text-muted py-3 italic">
                            {t('archives.noPapersInVolume')}
                          </p>
                        ) : (
                          <ul className="divide-y divide-line/60 rounded-xl border border-line bg-surface overflow-hidden">
                            {subs.map((article, idx) => (
                              <li
                                key={article.id}
                                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-surface-sunken/40 transition-colors"
                              >
                                <div className="space-y-1.5 min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-fg/8 text-muted">
                                      #{idx + 1}
                                    </span>
                                    <span className="text-xs font-medium text-accent-ink">
                                      {article.profiles?.full_name || t('archives.affiliatedResearcher')}
                                    </span>
                                  </div>

                                  <h4 className="text-sm font-semibold text-fg leading-snug">
                                    {article.title}
                                  </h4>

                                  {article.abstract && (
                                    <p className="text-xs text-muted line-clamp-2 leading-relaxed pt-0.5">
                                      {article.abstract}
                                    </p>
                                  )}
                                </div>

                                <div className="shrink-0 flex items-center gap-2 pt-2 sm:pt-0 self-end sm:self-center">
                                  <button
                                    type="button"
                                    onClick={() => copyCitation(article, ev)}
                                    className={`btn-outline btn-sm text-xs inline-flex items-center gap-1.5 transition-all ${
                                      copiedKey === article.id
                                        ? 'bg-ok/15 text-ok border-ok/40 font-bold'
                                        : 'text-fg'
                                    }`}
                                    title={t('archives.copyBibtexTitle')}
                                  >
                                    {copiedKey === article.id ? (
                                      <>
                                        <CheckIcon size={13} weight="bold" />
                                        <span>{t('archives.copied')}</span>
                                      </>
                                    ) : (
                                      <>
                                        <CopyIcon size={13} />
                                        <span>BibTeX</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* VUE 2 : ARTICLES PUBLIÉS (ACCÈS DIRECT + BIBTEX & PDF) */}
      {activeTab === 'papers' && (
        <div key="tab-papers" className="space-y-4 animate-panel-enter">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-fg">
            {t('archives.tabs.publishedPapers', { count: filteredPosters.length })}
          </h2>

          {loading ? (
            <div className="space-y-3">
              <div className="skeleton h-28 rounded-2xl" />
              <div className="skeleton h-28 rounded-2xl" />
              <div className="skeleton h-28 rounded-2xl" />
            </div>
          ) : filteredPosters.length === 0 ? (
            <div className="card p-12 text-center border-dashed space-y-3">
              <FileTextIcon size={36} className="text-muted mx-auto" weight="thin" />
              <h3 className="text-base font-semibold text-fg">{t('archives.emptyPapers.title')}</h3>
              <p className="text-xs sm:text-sm text-muted max-w-[50ch] mx-auto">
                {t('archives.emptyPapers.body')}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line/60 rounded-2xl border border-line bg-surface overflow-hidden shadow-card">
              {filteredPosters.map((article) => {
                const year = article.event?.start_date ? article.event.start_date.slice(0, 4) : ''
                return (
                  <li
                    key={`paper-${article.id}`}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-50/70 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span className="font-medium text-fg">
                          {article.profiles?.full_name || t('archives.affiliatedResearcher')}
                        </span>
                        <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">·</span>
                        <span className="truncate">{article.event?.title}</span>
                        {year && (
                          <>
                            <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">·</span>
                            <span className="font-mono num">{year}</span>
                          </>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-semibold text-fg leading-snug">
                        {article.title}
                      </h3>

                      {article.abstract && (
                        <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                          {article.abstract}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() => copyCitation(article, article.event)}
                        className="btn-outline btn-sm text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedKey === article.id ? (
                          <span className="font-medium text-fg">{t('archives.copiedCheck')}</span>
                        ) : (
                          <>
                            <CopyIcon size={13} />
                            <span>{t('archives.copyBibtex')}</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const { exportProceedingsPDF } = await import('../certificates/pdf')
                          exportProceedingsPDF({
                            eventTitle: article.event?.title || 'CONFERA',
                            submissions: [article],
                          })
                        }}
                        className="btn-outline btn-sm text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileTextIcon size={13} />
                        <span>{t('archives.pdfAction')}</span>
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* VUE 3 : GALERIE VISUELLE DES POSTERS SCIENTIFIQUES */}
      {activeTab === 'posters' && (
        <div key="tab-posters" className="space-y-6 animate-panel-enter">
          {filteredPosters.length === 0 ? (
            <div className="card p-12 text-center border-dashed space-y-3">
              <PresentationChartIcon size={36} className="text-muted mx-auto" weight="thin" />
              <h3 className="text-base font-semibold text-fg">{t('archives.emptyPosters.title')}</h3>
              <p className="text-xs sm:text-sm text-muted max-w-[50ch] mx-auto">
                {t('archives.emptyPosters.body')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosters.map((poster, index) => {
                const year = poster.event?.start_date ? poster.event.start_date.slice(0, 4) : '2026'

                return (
                  <article
                    key={poster.id}
                    className="group card overflow-hidden border border-line bg-surface flex flex-col justify-between shadow-card hover:border-neutral-300 dark:hover:border-white/20 hover:shadow-lift transition-all duration-200"
                  >
                    {/* PLANCHE POSTER SIMULÉE HAUTE FIDÉLITÉ (FORMAT A0 SCIENTIFIQUE) */}
                    <div className="p-4 bg-gradient-to-br from-surface-2 via-surface to-surface-sunken border-b border-line relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                      {/* Bandeau d'en-tête du poster académique */}
                      <div className="flex items-center justify-between pb-2 border-b border-line/60">
                        <span className="text-[10px] font-mono font-bold tracking-wider text-accent-ink uppercase">
                          {t('archives.posterBadge', { number: String(index + 1).padStart(2, '0') })}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-fg/10 text-muted">
                          {year}
                        </span>
                      </div>

                      {/* Contenu visuel simulé */}
                      <div className="my-3 space-y-2">
                        <h4 className="text-sm font-bold text-fg leading-tight line-clamp-2">
                          {poster.title}
                        </h4>
                        <p className="text-[11px] font-semibold text-accent-ink truncate">
                          {poster.profiles?.full_name || t('archives.researchTeamFallback')}
                        </p>
                        <p className="text-[10.5px] text-muted line-clamp-3 leading-relaxed">
                          {poster.abstract || t('archives.posterAbstractFallback')}
                        </p>
                      </div>

                      {/* Mini grille de colonnes scientifiques (Abstract / Méthodologie / Résultats) */}
                      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-line/50 text-[9px] text-muted font-mono">
                        <div className="bg-surface/80 p-1 rounded border border-line/50 text-center">
                          {t('archives.posterSections.introduction')}
                        </div>
                        <div className="bg-surface/80 p-1 rounded border border-line/50 text-center text-accent-ink font-semibold">
                          {t('archives.posterSections.methods')}
                        </div>
                        <div className="bg-surface/80 p-1 rounded border border-line/50 text-center text-ok font-semibold">
                          {t('archives.posterSections.results')}
                        </div>
                      </div>

                      {/* Bouton de survol plein écran */}
                      <div className="absolute inset-0 bg-navy/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewPoster(poster)}
                          className="btn-accent btn-sm text-xs font-semibold inline-flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
                        >
                          <EyeIcon size={14} weight="bold" />
                          <span>{t('archives.viewLarge')}</span>
                        </button>
                      </div>
                    </div>

                    {/* Bas de la carte */}
                    <div className="p-4 space-y-3 bg-surface">
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span className="truncate max-w-[200px] font-medium text-fg">
                          {poster.event?.title}
                        </span>
                        <span className="text-[11px] text-muted font-mono">{year}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-line/60">
                        <button
                          type="button"
                          onClick={() => setPreviewPoster(poster)}
                          className="btn-outline btn-sm text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <ArrowsOutIcon size={13} weight="bold" />
                          <span>{t('archives.fullscreen')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenEvent(poster.event_id)}
                          className="btn-ghost btn-sm text-xs font-semibold inline-flex items-center gap-1 text-muted hover:text-fg"
                        >
                          <span>{t('archives.conference')}</span>
                          <ArrowUpRightIcon size={12} weight="bold" className="rtl:rotate-180" />
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* VISIONNEUSE PLEIN ÉCRAN INTERACTIVE (LIGHTBOX HD) */}
      {previewPoster && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in"
        >
          <div className="bg-surface border border-line rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 animate-modal-enter">
            {/* Header lightbox */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-line">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-accent-ink px-2.5 py-0.5 rounded bg-accent/15 border border-accent/30 inline-block mb-1.5">
                  {t('archives.validatedPoster')}
                </span>
                <h3 className="text-base sm:text-xl font-bold text-fg leading-snug">
                  {previewPoster.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted mt-1">
                  {t('common.by')} <strong>{previewPoster.profiles?.full_name || t('archives.unknownAuthor')}</strong>
                  {previewPoster.profiles?.affiliation ? ` (${previewPoster.profiles.affiliation})` : ''}
                  {previewPoster.event?.title ? ` • ${previewPoster.event.title}` : ''}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPreviewPoster(null)}
                className="btn-ghost btn-sm text-muted hover:text-fg p-1.5 rounded-lg"
                aria-label={t('common.close')}
              >
                <XIcon size={22} />
              </button>
            </div>

            {/* Planche de communication scientifique */}
            <div className="rounded-xl border border-line bg-surface-2/40 p-6 sm:p-8 space-y-6">
              {/* En-tête avec métadonnées réelles */}
              <div className="text-center pb-4 border-b border-line space-y-2">
                {previewPoster.event?.title && (
                  <span className="text-xs uppercase font-mono tracking-widest text-accent-ink font-bold block">
                    {previewPoster.event.title}
                  </span>
                )}
                <h2 className="text-xl sm:text-2xl font-bold text-fg max-w-2xl mx-auto leading-tight">
                  {previewPoster.title}
                </h2>
                <div className="text-xs text-muted flex flex-wrap items-center justify-center gap-2">
                  <span className="font-semibold text-fg">
                    {previewPoster.profiles?.full_name || t('archives.unknownAuthor')}
                  </span>
                  {previewPoster.profiles?.affiliation && (
                    <>
                      <span>&bull;</span>
                      <span>{previewPoster.profiles.affiliation}</span>
                    </>
                  )}
                  {previewPoster.event?.start_date && (
                    <>
                      <span>&bull;</span>
                      <span>{new Date(previewPoster.event.start_date).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Résumé officiel de la soumission */}
              <div className="card p-5 border-line bg-surface space-y-2">
                <h4 className="font-bold text-accent-ink uppercase tracking-wide text-xs pb-1 border-b border-line">
                  {t('archives.scientificAbstract')}
                </h4>
                <p className="text-fg/85 leading-relaxed text-sm whitespace-pre-line">
                  {previewPoster.abstract || t('archives.noAbstractProvided')}
                </p>
              </div>

              {/* Métadonnées réelles de l'événement et de la publication */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="card p-4 border-line bg-surface space-y-1">
                  <span className="text-muted block text-[11px] font-semibold uppercase">{t('archives.organizingConference')}</span>
                  <span className="text-fg font-medium">{previewPoster.event?.title || t('archives.archivedConferenceFallback')}</span>
                  {previewPoster.event?.location && (
                    <span className="text-muted text-[11px] block">{previewPoster.event.location}</span>
                  )}
                </div>
                <div className="card p-4 border-line bg-surface space-y-1">
                  <span className="text-muted block text-[11px] font-semibold uppercase">{t('archives.statusAndPresentation')}</span>
                  <span className="text-fg font-medium">{t('archives.peerAccepted')}</span>
                  <span className="text-muted text-[11px] block">
                    {previewPoster.event?.start_date
                      ? t('archives.presentedOn', {
                          date: new Date(previewPoster.event.start_date).toLocaleDateString(locale, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          }),
                        })
                      : t('archives.officialProceedingsArchived')}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions du footer de la lightbox */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setPreviewPoster(null)
                  onOpenEvent(previewPoster.event_id)
                }}
                className="btn-outline btn-sm text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <span>{t('archives.accessFullConference')}</span>
                <ArrowUpRightIcon size={13} weight="bold" className="rtl:rotate-180" />
              </button>

              <button
                type="button"
                onClick={() => setPreviewPoster(null)}
                className="btn-primary btn-sm text-xs font-semibold"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
