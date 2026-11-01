import { useState } from 'react'
import {
  MapPinIcon,
  NavigationArrowIcon,
  TrainIcon,
  CarIcon,
  BuildingsIcon,
  ArrowSquareOutIcon,
  CopyIcon,
  CheckIcon,
} from '@phosphor-icons/react'
import Collapsible from './Collapsible'

export default function CampusMap({ location = 'Campus USTO-MB, Oran' }) {
  const [copied, setCopied] = useState(false)
  const query = location.trim() || 'Campus USTO-MB, Oran'
  const isUsto = /usto/i.test(query)

  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
  const gpsRouteUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(query)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignoré si non supporté
    }
  }

  return (
    <section className="card p-5 sm:p-6 border-line bg-surface/80 space-y-5" aria-labelledby="venue-heading">
      {/* En-tête avec titre, lieu et actions rapides */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-accent/15 text-accent-ink flex items-center justify-center shrink-0">
            <MapPinIcon size={20} weight="duotone" />
          </span>
          <div className="min-w-0">
            <h3 id="venue-heading" className="font-semibold text-base sm:text-lg text-fg tracking-tight">
              Plan d’Accès & Localisation
            </h3>
            <p className="text-xs sm:text-sm text-muted truncate mt-0.5" title={query}>
              {query}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="btn-outline btn-sm text-xs gap-1.5"
            title="Copier l'adresse complète dans le presse-papier"
          >
            {copied ? (
              <>
                <CheckIcon size={14} className="text-ok font-bold" />
                <span className="text-ok">Copié</span>
              </>
            ) : (
              <>
                <CopyIcon size={14} />
                <span>Copier l'adresse</span>
              </>
            )}
          </button>

          <a
            href={gpsRouteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-accent btn-sm text-xs gap-1.5 shadow-xs"
            title="Ouvrir l'itinéraire dans Google Maps / Waze / Apple Maps"
          >
            <NavigationArrowIcon size={14} weight="bold" />
            <span>Itinéraire GPS</span>
            <ArrowSquareOutIcon size={13} className="opacity-80" />
          </a>
        </div>
      </div>

      {/* Vraie carte interactive dynamique (100% responsive, zoom & déplacement) */}
      <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden border border-line bg-surface-2 shadow-xs group">
        <iframe
          title={`Carte interactive : ${query}`}
          src={mapEmbedUrl}
          className="w-full h-full border-0 grayscale-[0.1] contrast-[1.02] dark:invert-[0.9] dark:hue-rotate-180 dark:contrast-[1.1] dark:brightness-[0.9]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />

        {/* Badge informatif discret sur la carte */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-surface/90 border border-line backdrop-blur-md shadow-xs pointer-events-none text-[11px] font-medium text-fg flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-ok animate-pulse" />
          <span>Carte interactive • Zoom & Déplacement</span>
        </div>
      </div>

      {/* Guide d'accès & Précisions pratiques rétractables sous rideau */}
      <Collapsible
        title="Guide d'accès & commodités pratiques"
        subtitle="Tramway, parkings & accueil"
        variant="subtle"
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* 1. Salle & Amphi */}
          <div className="p-3.5 rounded-xl bg-surface border border-line flex items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-accent/15 text-accent-ink flex items-center justify-center shrink-0">
              <BuildingsIcon size={17} weight="duotone" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-xs text-fg">Lieu & Amphithéâtre</p>
              <p className="text-xs text-muted mt-1 leading-snug">
                {isUsto
                  ? 'Amphithéâtre Central & Salles de commissions du campus USTO-MB.'
                  : query}
              </p>
            </div>
          </div>

          {/* 2. Accès & Transports */}
          <div className="p-3.5 rounded-xl bg-surface border border-line flex items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-ok/15 text-ok flex items-center justify-center shrink-0">
              <TrainIcon size={17} weight="duotone" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-xs text-fg">Transports & Accès</p>
              <p className="text-xs text-muted mt-1 leading-snug">
                {isUsto
                  ? 'Tramway Ligne 1 : Arrêt direct Station USTO-MB (Portail d’honneur).'
                  : 'Accès via les principaux axes urbains, transports publics et taxis.'}
              </p>
            </div>
          </div>

          {/* 3. Stationnement & Accueil */}
          <div className="p-3.5 rounded-xl bg-surface border border-line flex items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-info/15 text-info flex items-center justify-center shrink-0">
              <CarIcon size={17} weight="duotone" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-xs text-fg">Parking & Accueil</p>
              <p className="text-xs text-muted mt-1 leading-snug">
                {isUsto
                  ? 'Parking visiteurs & dépose-minute disponibles sur présentation du pass.'
                  : 'Émargement et accueil des participants dès 8h30 à l’entrée principale.'}
              </p>
            </div>
          </div>
        </div>
      </Collapsible>
    </section>
  )
}
