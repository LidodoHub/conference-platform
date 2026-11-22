import { useState } from 'react'
import { detectTheme, coverStyle } from '../../lib/cover'
import ScientificPattern from './ScientificPatterns'

export default function EventCover({
  seed,
  event,
  coverUrl,
  className = '',
  children,
}) {
  // Enregistre uniquement les URL qui ont échoué de manière ciblée (évite de bloquer les autres photos lors de clics rapides)
  const [failedUrls, setFailedUrls] = useState({})

  const resolved = coverUrl
    ? { id: 'custom', custom: true, photo: coverUrl, color: '#101d36', accent: '#D2A24E' }
    : detectTheme(event || seed)

  const isGenerative = Boolean(resolved?.isGenerative && resolved?.patternKey)
  const photo = !isGenerative && resolved?.photo && !failedUrls[resolved.photo] ? resolved.photo : null
  const isEditorial = Boolean(resolved?.isEditorial || (!photo && !coverUrl))

  return (
    <div
      className={`relative overflow-hidden group/cover ${isEditorial && resolved?.id ? `editorial-cover editorial-cover--${resolved.id}` : ''} ${className}`}
      style={{
        backgroundColor: resolved?.color || '#0E1D38',
        ...(!photo && !isGenerative ? coverStyle(seed || event?.id) : {}),
      }}
    >
      {/* 1. Illustration scientifique vectorielle générative (Style Nature / ArXiv) - 0ms de latence */}
      {isGenerative && (
        <ScientificPattern
          patternKey={resolved.patternKey}
          className="transition-transform duration-700 ease-out group-hover:scale-105 group-hover/cover:scale-105"
        />
      )}

      {/* 2. Photographie scientifique réelle haute résolution (avec clé dynamique anti-blocage) */}
      {photo && (
        <img
          key={photo}
          src={photo}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrls((prev) => ({ ...prev, [photo]: true }))}
          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 group-hover/cover:scale-105 pointer-events-none"
        />
      )}

      {/* 3. Filtre Duotone signature USTO pour photos réelles */}
      {photo && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: [
              'linear-gradient(180deg, rgba(8, 16, 32, 0.35) 0%, rgba(8, 16, 32, 0.60) 45%, rgba(4, 9, 20, 0.90) 100%)',
              `radial-gradient(ellipse at 85% 15%, ${resolved?.accent ? resolved.accent + '38' : 'rgba(210, 162, 78, 0.22)'}, transparent 65%)`,
            ].join(', '),
          }}
          aria-hidden="true"
        />
      )}

      {/* 4. Trame scientifique subtile (tampon / grille de recherche) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.55) 1px, transparent 0)',
          backgroundSize: '16px 16px',
        }}
        aria-hidden="true"
      />

      {/* 5. Contenu interactif (Badges, dates, boutons, décomptes) */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between">
        {children}
      </div>
    </div>
  )
}
