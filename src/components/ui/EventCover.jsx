import { useState } from 'react'
import { detectTheme, coverStyle } from '../../lib/cover'
import ScientificPattern from './ScientificPatterns'

// Motifs éditoriaux vectoriels signatures (style éditorial épuré tel que dans les maquettes)
export function EditorialVectorPattern({ themeKey = 'sand', className = '' }) {
  if (themeKey === 'slate') {
    return (
      <svg className={`absolute inset-0 w-full h-full pointer-events-none ${className}`} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <g stroke="#3D6FB0" strokeOpacity="0.12" strokeWidth="0.8">
          <line x1="80" y1="0" x2="80" y2="200" />
          <line x1="160" y1="0" x2="160" y2="200" />
          <line x1="240" y1="0" x2="240" y2="200" />
          <line x1="320" y1="0" x2="320" y2="200" />
          <line x1="0" y1="50" x2="400" y2="50" />
          <line x1="0" y1="100" x2="400" y2="100" />
          <line x1="0" y1="150" x2="400" y2="150" />
        </g>
        <path d="M 80 140 L 160 85 L 240 100 L 320 45" fill="none" stroke="#C8963E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="320" cy="45" r="3.5" fill="#C8963E" />
      </svg>
    )
  }
  if (themeKey === 'radar') {
    return (
      <svg className={`absolute inset-0 w-full h-full pointer-events-none ${className}`} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" stroke="#D4A017" strokeOpacity="0.28" strokeWidth="1.2">
          <circle cx="330" cy="70" r="18" />
          <circle cx="330" cy="70" r="42" />
          <circle cx="330" cy="70" r="72" />
        </g>
        <circle cx="330" cy="70" r="3.5" fill="#D4A017" fillOpacity="0.85" />
      </svg>
    )
  }
  // Thème 'sand' par défaut
  return (
    <svg className={`absolute inset-0 w-full h-full pointer-events-none ${className}`} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke="#C8963E" strokeOpacity="0.22" strokeWidth="1.2">
        <circle cx="340" cy="45" r="40" />
        <circle cx="340" cy="45" r="85" />
        <circle cx="340" cy="45" r="140" />
        <circle cx="340" cy="45" r="200" />
      </g>
    </svg>
  )
}

export default function EventCover({
  seed,
  event,
  coverUrl,
  themeKey,
  className = '',
  children,
}) {
  const [failedUrls, setFailedUrls] = useState({})

  const resolved = coverUrl
    ? { id: 'custom', custom: true, photo: coverUrl, color: '#101d36', accent: '#D2A24E' }
    : detectTheme(event || seed)

  const activeThemeKey = themeKey || (event?.status === 'ongoing' ? 'radar' : resolved?.id)
  const isEditorialVector = ['sand', 'slate', 'radar', 'sage'].includes(activeThemeKey)
  const isGenerative = !isEditorialVector && Boolean(resolved?.isGenerative && resolved?.patternKey)
  const photo = !isEditorialVector && !isGenerative && resolved?.photo && !failedUrls[resolved.photo] ? resolved.photo : null
  const isEditorial = Boolean(isEditorialVector || resolved?.isEditorial || (!photo && !coverUrl))

  return (
    <div
      className={`relative overflow-hidden group/cover ${isEditorial && activeThemeKey ? `editorial-cover editorial-cover--${activeThemeKey}` : ''} ${className}`}
      style={{
        backgroundColor: activeThemeKey === 'radar' ? '#141416' : (resolved?.color || '#0E1D38'),
        ...(!photo && !isGenerative && !isEditorialVector ? coverStyle(seed || event?.id) : {}),
      }}
    >
      {/* 1. Motifs vectoriels éditoriaux signatures (sand, slate, radar) */}
      {isEditorialVector && (
        <EditorialVectorPattern
          themeKey={activeThemeKey}
          className="transition-transform duration-700 ease-out group-hover:scale-105 group-hover/cover:scale-105"
        />
      )}

      {/* 2. Illustration scientifique vectorielle générative (Style Nature / ArXiv) */}
      {isGenerative && (
        <ScientificPattern
          patternKey={resolved.patternKey}
          className="transition-transform duration-700 ease-out group-hover:scale-105 group-hover/cover:scale-105"
        />
      )}

      {/* 3. Photographie scientifique réelle haute résolution */}
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

      {/* 4. Filtre Duotone pour photos réelles */}
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

      {/* 5. Trame subtile pour photos */}
      {photo && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.55) 1px, transparent 0)',
            backgroundSize: '16px 16px',
          }}
          aria-hidden="true"
        />
      )}

      {/* 6. Contenu interactif (Badges, dates, boutons, décomptes) */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between">
        {children}
      </div>
    </div>
  )
}
