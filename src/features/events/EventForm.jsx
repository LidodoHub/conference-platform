import { useState } from 'react'
import { SparkleIcon, LockSimpleIcon, ImageSquareIcon } from '@phosphor-icons/react'
import { TYPE_LABELS, FORMAT_LABELS } from '../../lib/constants'
import { GENERATIVE_THEMES, PHOTO_THEMES, THEMES, cleanDescription, extractCoverKey } from '../../lib/cover'
import { useLanguage } from '../../context/LanguageContext'
import EventCard from './EventCard'

const EMPTY_EVENT = {
  title: '',
  description: '',
  type: 'conference',
  format: 'onsite',
  start_date: '',
  end_date: '',
  location: '',
}

// Formulaire partagé : création (EventsPage) et modification (onglet Organisation).
export default function EventForm({
  initial = EMPTY_EVENT,
  submitLabel,
  busyLabel,
  onSubmit,
  onCancel,
  error,
  showPreview = true,
  lockedFields = [],
}) {
  const { t } = useLanguage()
  const initialKey = extractCoverKey(initial.description)
  const isCustom = initialKey && (initialKey.startsWith('http://') || initialKey.startsWith('https://'))
  const initialThemeMode = isCustom ? 'custom' : initialKey && THEMES[initialKey] ? initialKey : 'auto'

  const [form, setForm] = useState({
    ...EMPTY_EVENT,
    ...initial,
    description: cleanDescription(initial.description || ''),
  })
  const [themeMode, setThemeMode] = useState(initialThemeMode)
  const [customCoverUrl, setCustomCoverUrl] = useState(isCustom ? initialKey : '')
  const [localError, setLocalError] = useState(null)
  const [busy, setBusy] = useState(false)

  const field = (name) => ({
    value: form[name] ?? '',
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
  })

  const submit = async (e) => {
    e.preventDefault()
    setLocalError(null)
    if (form.end_date && form.start_date && form.end_date < form.start_date) {
      setLocalError(t('eventForm.endDateBeforeStart'))
      return
    }

    setBusy(true)

    // Construction de la description avec métadonnée de couverture si sélectionnée
    let desc = cleanDescription(form.description).trim()
    if (themeMode === 'custom' && customCoverUrl.trim()) {
      const trimmedUrl = customCoverUrl.trim()
      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        setLocalError(t('eventForm.customUrlError'))
        return
      }
      desc = desc ? `${desc}\n\n<!-- cover:${trimmedUrl} -->` : `<!-- cover:${trimmedUrl} -->`
      if (initial.id) {
        try {
          localStorage.setItem(`confera_cover_${initial.id}`, trimmedUrl)
        } catch {
          // ignore
        }
      }
    } else if (themeMode !== 'auto') {
      desc = desc ? `${desc}\n\n<!-- cover:${themeMode} -->` : `<!-- cover:${themeMode} -->`
      if (initial.id) {
        try {
          localStorage.setItem(`confera_cover_${initial.id}`, themeMode)
        } catch {
          // ignore
        }
      }
    }

    await onSubmit({
      title: form.title.trim(),
      description: desc || null,
      type: form.type,
      format: form.format,
      start_date: form.start_date,
      end_date: form.end_date || form.start_date,
      location: form.location.trim() || null,
    })
    setBusy(false)
  }

  const shownError = localError || error

  // Modèle d'aperçu dynamique instantané
  const previewEvent = {
    id: initial.id || 'preview-mock-seed',
    title: form.title.trim() || t('eventForm.previewTitleFallback'),
    description: form.description.trim() || '',
    type: form.type || 'conference',
    format: form.format || 'onsite',
    status: initial.status || 'draft',
    phase: initial.phase || 'scientific',
    start_date: form.start_date || new Date().toISOString().slice(0, 10),
    end_date: form.end_date || form.start_date || new Date().toISOString().slice(0, 10),
    location: form.location.trim() || t('eventForm.previewLocationFallback'),
    themeKey: themeMode !== 'auto' && themeMode !== 'custom' ? themeMode : null,
    cover_url: themeMode === 'custom' && customCoverUrl.trim() ? customCoverUrl.trim() : null,
  }

  return (
    <div className={showPreview ? 'grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_360px] gap-8 items-start' : ''}>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="event-title" className="form-label">
            {t('eventForm.titleLabel')}
          </label>
          <input
            id="event-title"
            className="input-field"
            placeholder={t('eventForm.titlePlaceholder')}
            required
            {...field('title')}
          />
        </div>

        <div>
          <label htmlFor="event-desc" className="form-label">
            {t('eventForm.descLabel')}
          </label>
          <textarea
            id="event-desc"
            className="textarea-field"
            rows={4}
            placeholder={t('eventForm.descPlaceholder')}
            {...field('description')}
          />
          <p className="form-hint">{t('eventForm.descHint')}</p>
        </div>

        {/* Sélecteur de visuel : Automatique, Nature/ArXiv Génératif, Photos HD ou Affiche */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <label className="form-label mb-0">{t('eventForm.coverHeading')}</label>
            <span className="text-[11px] text-muted">{t('eventForm.coverSubheading')}</span>
          </div>

          {/* Mode automatique */}
          <button
            type="button"
            onClick={() => setThemeMode('auto')}
            className={`w-full p-2.5 rounded-xl border text-start flex items-center justify-between transition-all ${
              themeMode === 'auto'
                ? 'border-accent bg-accent/12 ring-1 ring-accent'
                : 'border-line/70 bg-surface/70 hover:bg-surface-sunken'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <SparkleIcon size={16} className="text-accent-ink shrink-0" weight="bold" />
              <div>
                <span className="text-xs font-semibold text-fg block">{t('eventForm.autoTitle')}</span>
                <span className="text-[10.5px] text-muted block">
                  {t('eventForm.autoDesc')}
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                themeMode === 'auto' ? 'bg-accent text-on-accent' : 'bg-surface-sunken text-muted'
              }`}
            >
              {t('eventForm.defaultBadge')}
            </span>
          </button>

          {/* Illustrations scientifiques Nature / ArXiv */}
          <div className="space-y-1.5">
            <span className="block text-[11px] font-semibold text-fg/80 uppercase tracking-wider">
              {t('eventForm.generativeHeading')}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(GENERATIVE_THEMES).map(([key, th]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setThemeMode(key)}
                  className={`p-2 rounded-xl border text-start transition-all ${
                    themeMode === key
                      ? 'border-accent bg-accent/12 ring-1 ring-accent'
                      : 'border-line/70 bg-surface/70 hover:bg-surface-sunken'
                  }`}
                >
                  <span className="block text-xs font-semibold text-fg truncate">{th.label}</span>
                  <span className="block text-[10px] text-accent-ink truncate mt-0.5 font-medium">{th.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Photographies scientifiques réelles */}
          <div className="space-y-1.5">
            <span className="block text-[11px] font-semibold text-fg/80 uppercase tracking-wider">
              {t('eventForm.photoHeading')}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(PHOTO_THEMES).map(([key, th]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setThemeMode(key)}
                  className={`p-2 rounded-xl border text-start transition-all ${
                    themeMode === key
                      ? 'border-accent bg-accent/12 ring-1 ring-accent'
                      : 'border-line/70 bg-surface/70 hover:bg-surface-sunken'
                  }`}
                >
                  <span className="block text-xs font-semibold text-fg truncate">{th.label}</span>
                  <span className="block text-[10px] text-muted truncate mt-0.5">{th.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Option Affiche personnalisée */}
          <button
            type="button"
            onClick={() => setThemeMode('custom')}
            className={`w-full p-2.5 rounded-xl border text-start flex items-center justify-between transition-all ${
              themeMode === 'custom'
                ? 'border-accent bg-accent/12 ring-1 ring-accent'
                : 'border-line/70 bg-surface/70 hover:bg-surface-sunken'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ImageSquareIcon size={18} className="text-accent-ink" weight="duotone" />
              <div>
                <span className="text-xs font-semibold text-fg block">{t('eventForm.customTitle')}</span>
                <span className="text-[10.5px] text-muted block">{t('eventForm.customDesc')}</span>
              </div>
            </div>
            <span className="text-[10px] text-muted font-medium">{t('eventForm.webLink')}</span>
          </button>

          {themeMode === 'custom' && (
            <div className="p-3 rounded-xl bg-surface-sunken/60 border border-line/70 space-y-1.5">
              <input
                type="url"
                className="input-field text-xs"
                placeholder={t('eventForm.customPlaceholder')}
                value={customCoverUrl}
                onChange={(e) => setCustomCoverUrl(e.target.value)}
                autoFocus
              />
              <p className="form-hint text-[11px]">{t('eventForm.customHint')}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="event-type" className="form-label flex items-center justify-between">
              <span>{t('eventForm.typeLabel')}</span>
              {lockedFields.includes('type') && (
                <span className="text-[11px] text-muted flex items-center gap-1 font-normal">
                  <LockSimpleIcon size={12} weight="bold" /> {t('eventForm.locked')}
                </span>
              )}
            </label>
            <select
              id="event-type"
              className={`select-field ${lockedFields.includes('type') ? 'opacity-65 cursor-not-allowed bg-surface-2' : ''}`}
              disabled={lockedFields.includes('type')}
              {...field('type')}
            >
              {Object.keys(TYPE_LABELS).map((v) => (
                <option key={v} value={v}>
                  {t(`eventCard.types.${v}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="event-format" className="form-label flex items-center justify-between">
              <span>{t('eventForm.formatLabel')}</span>
              {lockedFields.includes('format') && (
                <span className="text-[11px] text-muted flex items-center gap-1 font-normal">
                  <LockSimpleIcon size={12} weight="bold" /> {t('eventForm.locked')}
                </span>
              )}
            </label>
            <select
              id="event-format"
              className={`select-field ${lockedFields.includes('format') ? 'opacity-65 cursor-not-allowed bg-surface-2' : ''}`}
              disabled={lockedFields.includes('format')}
              {...field('format')}
            >
              {Object.keys(FORMAT_LABELS).map((v) => (
                <option key={v} value={v}>
                  {t(`eventCard.formats.${v}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="event-start" className="form-label flex items-center justify-between">
              <span>{t('eventForm.startLabel')}</span>
              {lockedFields.includes('start_date') && (
                <span className="text-[11px] text-muted flex items-center gap-1 font-normal">
                  <LockSimpleIcon size={12} weight="bold" /> {t('eventForm.locked')}
                </span>
              )}
            </label>
            <input
              id="event-start"
              type="date"
              className={`input-field num ${lockedFields.includes('start_date') ? 'opacity-65 cursor-not-allowed bg-surface-2' : ''}`}
              disabled={lockedFields.includes('start_date')}
              required
              {...field('start_date')}
            />
          </div>
          <div>
            <label htmlFor="event-end" className="form-label flex items-center justify-between">
              <span>{t('eventForm.endLabel')}</span>
              {lockedFields.includes('end_date') && (
                <span className="text-[11px] text-muted flex items-center gap-1 font-normal">
                  <LockSimpleIcon size={12} weight="bold" /> {t('eventForm.locked')}
                </span>
              )}
            </label>
            <input
              id="event-end"
              type="date"
              className={`input-field num ${lockedFields.includes('end_date') ? 'opacity-65 cursor-not-allowed bg-surface-2' : ''}`}
              disabled={lockedFields.includes('end_date')}
              min={form.start_date || undefined}
              {...field('end_date')}
            />
            {!lockedFields.includes('end_date') && (
              <p className="form-hint">{t('eventForm.endHint')}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="event-location" className="form-label flex items-center justify-between">
            <span>{t('eventForm.locationLabel')}</span>
            <span className="text-[11px] text-muted font-normal">{t('eventForm.locationSublabel')}</span>
          </label>
          <input
            id="event-location"
            list="venue-suggestions"
            className="input-field"
            placeholder={t('eventForm.locationPlaceholder')}
            {...field('location')}
          />
          <datalist id="venue-suggestions">
            <option value="Campus USTO-MB (Amphi Central), Oran" />
            <option value="Faculté d'Informatique & Mathématiques - USTO-MB, Oran" />
            <option value="Auditorium Central - USTO-MB, Bir El Djir" />
            <option value="Centre des Conventions d'Oran (CCO Mohamed Benahmed)" />
            <option value="Hôtel Le Méridien & Centre de Congrès, Oran" />
            <option value="Université d'Oran 1 Ahmed Ben Bella (Es-Sénia)" />
            <option value="Université Alger 1 Benyoucef Benkhedda" />
            <option value="En ligne (Visioconférence)" />
          </datalist>

          {/* Raccourcis de lieux fréquents en 1 clic */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              { label: 'USTO Amphi Central', val: 'Campus USTO-MB (Amphi Central), Oran' },
              { label: 'USTO Fac Info', val: 'Faculté d\'Informatique - USTO-MB, Oran' },
              { label: 'Centre des Conventions (CCO)', val: 'Centre des Conventions d\'Oran (CCO)' },
              { label: 'Le Méridien Oran', val: 'Hôtel Le Méridien & Centre de Congrès, Oran' },
            ].map((sug) => (
              <button
                key={sug.label}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, location: sug.val }))}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all duration-150 cursor-pointer active:scale-95 ${
                  form.location === sug.val
                    ? 'bg-accent/15 border-accent text-accent-ink font-semibold'
                    : 'bg-surface-2 border-line text-muted hover:text-fg hover:border-line/80'
                }`}
              >
                {sug.label}
              </button>
            ))}
          </div>
        </div>

        {shownError && (
          <div role="alert" className="alert-error">
            {shownError}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? busyLabel : submitLabel}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-ghost">
              {t('common.cancel')}
            </button>
          )}
        </div>
      </form>

      {showPreview && (
        <aside className="hidden lg:flex flex-col gap-3 sticky top-24">
          <div className="flex items-center justify-between text-xs text-muted px-1">
            <span className="font-semibold uppercase tracking-wider text-fg/75">{t('eventForm.livePreview')}</span>
            <span className="badge-ok text-[10px] tracking-wide">{t('eventForm.instantMirror')}</span>
          </div>

          <div className="p-3 bg-surface-sunken/60 rounded-2xl border border-line/70 shadow-xs pointer-events-none">
            <EventCard event={previewEvent} role="organizer" onOpen={() => {}} />
          </div>

          <div className="card p-3.5 bg-surface/70 border-line/70 text-xs text-muted space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium text-fg">
              <SparkleIcon size={14} className="text-accent" weight="fill" />
              <span>{t('eventForm.catalogRenderTitle')}</span>
            </div>
            <p className="text-[11.5px] leading-relaxed text-faint">
              {t('eventForm.catalogRenderDesc')}
            </p>
          </div>
        </aside>
      )}
    </div>
  )
}
