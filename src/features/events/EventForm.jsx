import { useState } from 'react'
import { SparkleIcon, LockSimpleIcon, ImageSquareIcon } from '@phosphor-icons/react'
import { TYPE_LABELS, FORMAT_LABELS } from '../../lib/constants'
import { GENERATIVE_THEMES, PHOTO_THEMES, THEMES, cleanDescription, extractCoverKey } from '../../lib/cover'
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
      setLocalError('La date de fin doit être le même jour ou après la date de début.')
      return
    }

    setBusy(true)

    // Construction de la description avec métadonnée de couverture si sélectionnée
    let desc = cleanDescription(form.description).trim()
    if (themeMode === 'custom' && customCoverUrl.trim()) {
      desc = desc ? `${desc}\n\n<!-- cover:${customCoverUrl.trim()} -->` : `<!-- cover:${customCoverUrl.trim()} -->`
      if (initial.id) {
        try {
          localStorage.setItem(`confera_cover_${initial.id}`, customCoverUrl.trim())
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
    title: form.title.trim() || 'Titre de votre événement ou conférence',
    description: form.description.trim() || '',
    type: form.type || 'conference',
    format: form.format || 'onsite',
    status: initial.status || 'draft',
    phase: initial.phase || 'submission',
    start_date: form.start_date || new Date().toISOString().slice(0, 10),
    end_date: form.end_date || form.start_date || new Date().toISOString().slice(0, 10),
    location: form.location.trim() || 'Campus USTO-MB, Oran',
    themeKey: themeMode !== 'auto' && themeMode !== 'custom' ? themeMode : null,
    cover_url: themeMode === 'custom' && customCoverUrl.trim() ? customCoverUrl.trim() : null,
  }

  return (
    <div className={showPreview ? 'grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_360px] gap-8 items-start' : ''}>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="event-title" className="form-label">
            Titre de la conférence
          </label>
          <input
            id="event-title"
            className="input-field"
            placeholder="ex. Congrès International de Biotechnologie & IA"
            required
            {...field('title')}
          />
        </div>

        <div>
          <label htmlFor="event-desc" className="form-label">
            Description & Thématiques
          </label>
          <textarea
            id="event-desc"
            className="textarea-field"
            rows={4}
            placeholder="Présentation des axes de recherche, public visé, appel à communications scientifiques..."
            {...field('description')}
          />
          <p className="form-hint">Axes de recherche, public visé et appel à communications.</p>
        </div>

        {/* Sélecteur de visuel : Automatique, Nature/ArXiv Génératif, Photos HD ou Affiche */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <label className="form-label mb-0">Style visuel & Couverture</label>
            <span className="text-[11px] text-muted">Photos HD ou Illustrations Nature / ArXiv</span>
          </div>

          {/* Mode automatique */}
          <button
            type="button"
            onClick={() => setThemeMode('auto')}
            className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
              themeMode === 'auto'
                ? 'border-accent bg-accent/12 ring-1 ring-accent'
                : 'border-line/70 bg-surface/70 hover:bg-surface-sunken'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">✨</span>
              <div>
                <span className="text-xs font-semibold text-fg block">Automatique intelligent</span>
                <span className="text-[10.5px] text-muted block">
                  Détecte les mots-clés ou applique une illustration ArXiv / Nature par défaut (ex. pour "test_event")
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                themeMode === 'auto' ? 'bg-accent text-on-accent' : 'bg-surface-sunken text-muted'
              }`}
            >
              Par défaut
            </span>
          </button>

          {/* Illustrations scientifiques Nature / ArXiv */}
          <div className="space-y-1.5">
            <span className="block text-[11px] font-semibold text-fg/80 uppercase tracking-wider">
              Illustrations scientifiques vectorielles (Style ArXiv & Nature)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(GENERATIVE_THEMES).map(([key, t]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setThemeMode(key)}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    themeMode === key
                      ? 'border-accent bg-accent/12 ring-1 ring-accent'
                      : 'border-line/70 bg-surface/70 hover:bg-surface-sunken'
                  }`}
                >
                  <span className="block text-xs font-semibold text-fg truncate">{t.label}</span>
                  <span className="block text-[10px] text-accent-ink truncate mt-0.5 font-medium">{t.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Photographies scientifiques réelles */}
          <div className="space-y-1.5">
            <span className="block text-[11px] font-semibold text-fg/80 uppercase tracking-wider">
              Photographies scientifiques en bichromie USTO
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(PHOTO_THEMES).map(([key, t]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setThemeMode(key)}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    themeMode === key
                      ? 'border-accent bg-accent/12 ring-1 ring-accent'
                      : 'border-line/70 bg-surface/70 hover:bg-surface-sunken'
                  }`}
                >
                  <span className="block text-xs font-semibold text-fg truncate">{t.label}</span>
                  <span className="block text-[10px] text-muted truncate mt-0.5">{t.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Option Affiche personnalisée */}
          <button
            type="button"
            onClick={() => setThemeMode('custom')}
            className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
              themeMode === 'custom'
                ? 'border-accent bg-accent/12 ring-1 ring-accent'
                : 'border-line/70 bg-surface/70 hover:bg-surface-sunken'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ImageSquareIcon size={18} className="text-accent-ink" weight="duotone" />
              <div>
                <span className="text-xs font-semibold text-fg block">Affiche officielle personnalisée</span>
                <span className="text-[10.5px] text-muted block">Renseigner une URL d'image ou d'affiche officielle</span>
              </div>
            </div>
            <span className="text-[10px] text-muted font-medium">Lien web</span>
          </button>

          {themeMode === 'custom' && (
            <div className="p-3 rounded-xl bg-surface-sunken/60 border border-line/70 space-y-1.5">
              <input
                type="url"
                className="input-field text-xs"
                placeholder="https://... (URL directe de votre affiche PNG, JPG ou WebP)"
                value={customCoverUrl}
                onChange={(e) => setCustomCoverUrl(e.target.value)}
                autoFocus
              />
              <p className="form-hint text-[11px]">L'affiche sera automatiquement cadrée en couverture de la carte.</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="event-type" className="form-label flex items-center justify-between">
              <span>Type</span>
              {lockedFields.includes('type') && (
                <span className="text-[11px] text-muted flex items-center gap-1 font-normal">
                  <LockSimpleIcon size={12} weight="bold" /> Verrouillé
                </span>
              )}
            </label>
            <select
              id="event-type"
              className={`select-field ${lockedFields.includes('type') ? 'opacity-65 cursor-not-allowed bg-surface-2' : ''}`}
              disabled={lockedFields.includes('type')}
              {...field('type')}
            >
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="event-format" className="form-label flex items-center justify-between">
              <span>Format</span>
              {lockedFields.includes('format') && (
                <span className="text-[11px] text-muted flex items-center gap-1 font-normal">
                  <LockSimpleIcon size={12} weight="bold" /> Verrouillé
                </span>
              )}
            </label>
            <select
              id="event-format"
              className={`select-field ${lockedFields.includes('format') ? 'opacity-65 cursor-not-allowed bg-surface-2' : ''}`}
              disabled={lockedFields.includes('format')}
              {...field('format')}
            >
              {Object.entries(FORMAT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="event-start" className="form-label flex items-center justify-between">
              <span>Début</span>
              {lockedFields.includes('start_date') && (
                <span className="text-[11px] text-muted flex items-center gap-1 font-normal">
                  <LockSimpleIcon size={12} weight="bold" /> Verrouillé
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
              <span>Fin</span>
              {lockedFields.includes('end_date') && (
                <span className="text-[11px] text-muted flex items-center gap-1 font-normal">
                  <LockSimpleIcon size={12} weight="bold" /> Verrouillé
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
              <p className="form-hint">Laisse vide pour un événement d'une journée.</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="event-location" className="form-label flex items-center justify-between">
            <span>Lieu & Accès</span>
            <span className="text-[11px] text-muted font-normal">Campus, amphi ou adresse</span>
          </label>
          <input
            id="event-location"
            list="venue-suggestions"
            className="input-field"
            placeholder="ex. Campus USTO-MB (Amphi Central), Oran"
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
              Annuler
            </button>
          )}
        </div>
      </form>

      {showPreview && (
        <aside className="hidden lg:flex flex-col gap-3 sticky top-24">
          <div className="flex items-center justify-between text-xs text-muted px-1">
            <span className="font-semibold uppercase tracking-wider text-fg/75">Aperçu en direct</span>
            <span className="badge-ok text-[10px] tracking-wide">Miroir instantané</span>
          </div>

          <div className="p-3 bg-surface-sunken/60 rounded-2xl border border-line/70 shadow-xs pointer-events-none">
            <EventCard event={previewEvent} role="organizer" onOpen={() => {}} />
          </div>

          <div className="card p-3.5 bg-surface/70 border-line/70 text-xs text-muted space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium text-fg">
              <SparkleIcon size={14} className="text-accent" weight="fill" />
              <span>Rendu catalogue officiel</span>
            </div>
            <p className="text-[11.5px] leading-relaxed text-faint">
              Basculez librement entre les styles. Les illustrations ArXiv et Nature se génèrent instantanément à 0ms de latence.
            </p>
          </div>
        </aside>
      )}
    </div>
  )
}
