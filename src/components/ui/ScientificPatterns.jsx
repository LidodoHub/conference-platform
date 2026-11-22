// Illustrations scientifiques génératives (Style Nature / ArXiv / IEEE)
// 100% SVG vectoriel, 0 requête réseau, 0ms de latence, netteté vectorielle infinie.

export function ArxivGraphPattern({ className = '' }) {
  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="ag-glow1" cx="35%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#C8963E" stopOpacity="0.32" />
          <stop offset="60%" stopColor="#3D6FB0" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#0B132B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ag-glow2" cx="75%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#818CF8" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#0B132B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ag-line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C8963E" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#818CF8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Halos de lumière de fond */}
      <rect width="400" height="220" fill="#0B132B" />
      <circle cx="140" cy="90" r="130" fill="url(#ag-glow1)" />
      <circle cx="310" cy="70" r="100" fill="url(#ag-glow2)" />

      {/* Grille fine de coordonnées */}
      <g stroke="#ffffff" strokeOpacity="0.04" strokeWidth="0.8">
        <line x1="0" y1="40" x2="400" y2="40" />
        <line x1="0" y1="90" x2="400" y2="90" />
        <line x1="0" y1="140" x2="400" y2="140" />
        <line x1="0" y1="190" x2="400" y2="190" />
        <line x1="80" y1="0" x2="80" y2="220" />
        <line x1="180" y1="0" x2="180" y2="220" />
        <line x1="280" y1="0" x2="280" y2="220" />
        <line x1="380" y1="0" x2="380" y2="220" />
      </g>

      {/* Lignes de graphes / réseaux neuronaux */}
      <g stroke="url(#ag-line-grad)" strokeWidth="1.2" fill="none">
        <path d="M 50 60 L 130 45 L 210 80 L 160 145 L 75 130 Z" opacity="0.75" />
        <path d="M 130 45 L 230 35 L 320 65 L 285 135 L 210 80" opacity="0.65" />
        <path d="M 285 135 L 360 115 L 380 170 L 290 190 L 210 160 L 160 145" opacity="0.5" />
        <path d="M 75 130 L 120 185 L 210 160" strokeDasharray="3 3" opacity="0.4" />
        <path d="M 230 35 L 340 30 L 320 65" strokeDasharray="2 2" opacity="0.5" />
      </g>

      {/* Nœuds principaux avec halos concentriques */}
      {[
        [50, 60, 4],
        [130, 45, 5],
        [210, 80, 6],
        [160, 145, 4.5],
        [75, 130, 3.5],
        [230, 35, 4],
        [320, 65, 5.5],
        [285, 135, 5],
        [360, 115, 4],
        [380, 170, 3.5],
        [210, 160, 4.5],
        [120, 185, 3],
      ].map(([cx, cy, r], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={r * 2.2} fill="#C8963E" fillOpacity="0.12" />
          <circle cx={cx} cy={cy} r={r} fill="#0E2140" stroke="#C8963E" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r={r * 0.4} fill="#ffffff" />
        </g>
      ))}
    </svg>
  )
}

export function NatureQuantumPattern({ className = '' }) {
  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="nq-center" cx="45%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#A855F7" stopOpacity="0.35" />
          <stop offset="45%" stopColor="#3B82F6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0B091A" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="220" fill="#0B091A" />
      <circle cx="180" cy="110" r="140" fill="url(#nq-center)" />

      {/* Ondes harmoniques concentriques */}
      <g fill="none" stroke="#C084FC" strokeOpacity="0.3" strokeWidth="1">
        <circle cx="180" cy="110" r="25" />
        <circle cx="180" cy="110" r="45" strokeOpacity="0.45" strokeWidth="1.2" />
        <circle cx="180" cy="110" r="70" strokeDasharray="4 3" strokeOpacity="0.35" />
        <circle cx="180" cy="110" r="100" strokeOpacity="0.25" />
        <circle cx="180" cy="110" r="135" strokeDasharray="6 4" strokeOpacity="0.2" />
        <circle cx="180" cy="110" r="175" strokeOpacity="0.12" />
      </g>

      {/* Deuxième centre d'interférence ondulatoire (effet de fente d'Young) */}
      <g fill="none" stroke="#38BDF8" strokeOpacity="0.25" strokeWidth="1">
        <circle cx="260" cy="95" r="35" strokeOpacity="0.35" />
        <circle cx="260" cy="95" r="65" strokeDasharray="3 3" strokeOpacity="0.28" />
        <circle cx="260" cy="95" r="105" strokeOpacity="0.18" />
        <circle cx="260" cy="95" r="150" strokeOpacity="0.1" />
      </g>

      {/* Ondes sinusoïdales de probabilité quantique */}
      <path
        d="M -10 140 Q 50 80 120 140 T 240 140 T 360 140 T 420 140"
        fill="none"
        stroke="#34D399"
        strokeWidth="1.6"
        strokeOpacity="0.6"
      />
      <path
        d="M -10 140 Q 50 100 120 140 T 240 140 T 360 140 T 420 140"
        fill="none"
        stroke="#A78BFA"
        strokeWidth="1.2"
        strokeOpacity="0.4"
      />
      <path
        d="M -10 80 Q 70 130 150 80 T 290 80 T 420 80"
        fill="none"
        stroke="#38BDF8"
        strokeWidth="1.2"
        strokeOpacity="0.35"
        strokeDasharray="4 2"
      />

      {/* Particules quantiques luminescentes */}
      {[
        [180, 110, 4, '#FFFFFF'],
        [260, 95, 3.5, '#38BDF8'],
        [120, 140, 3, '#34D399'],
        [240, 140, 3, '#34D399'],
        [360, 140, 2.5, '#34D399'],
        [150, 80, 2.5, '#C084FC'],
        [290, 80, 3, '#C084FC'],
      ].map(([cx, cy, r, col], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={col} />
      ))}
    </svg>
  )
}

export function NatureLatticePattern({ className = '' }) {
  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="nl-glow" cx="60%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.32" />
          <stop offset="60%" stopColor="#059669" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#061A16" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="220" fill="#061A16" />
      <circle cx="240" cy="110" r="140" fill="url(#nl-glow)" />

      {/* Réseau de graphène / nid d'abeilles moléculaire */}
      <g stroke="#10B981" strokeWidth="1.2" strokeOpacity="0.35" fill="none">
        <polygon points="60,40 85,25 110,40 110,70 85,85 60,70" />
        <polygon points="110,40 135,25 160,40 160,70 135,85 110,70" />
        <polygon points="160,40 185,25 210,40 210,70 185,85 160,70" strokeOpacity="0.5" strokeWidth="1.4" />
        <polygon points="210,40 235,25 260,40 260,70 235,85 210,70" strokeOpacity="0.6" strokeWidth="1.5" />
        <polygon points="260,40 285,25 310,40 310,70 285,85 260,70" strokeOpacity="0.4" />

        <polygon points="85,85 110,70 135,85 135,115 110,130 85,115" />
        <polygon points="135,85 160,70 185,85 185,115 160,130 135,115" strokeOpacity="0.6" strokeWidth="1.5" />
        <polygon points="185,85 210,70 235,85 235,115 210,130 185,115" strokeOpacity="0.75" strokeWidth="1.6" />
        <polygon points="235,85 260,70 285,85 285,115 260,130 235,115" strokeOpacity="0.6" strokeWidth="1.5" />
        <polygon points="285,85 310,70 335,85 335,115 310,130 285,115" strokeOpacity="0.4" />

        <polygon points="110,130 135,115 160,130 160,160 135,175 110,160" />
        <polygon points="160,130 185,115 210,130 210,160 185,175 160,160" strokeOpacity="0.5" />
        <polygon points="210,130 235,115 260,130 260,160 235,175 210,160" strokeOpacity="0.6" />
        <polygon points="260,130 285,115 310,130 310,160 285,175 260,160" strokeOpacity="0.35" />
      </g>

      {/* Sommets atomiques avec lueurs d'électrons */}
      {[
        [185, 85], [210, 70], [235, 85], [210, 130], [185, 115], [235, 115],
        [160, 70], [260, 70], [160, 130], [260, 130]
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="3.5" fill="#34D399" />
          <circle cx={cx} cy={cy} r="6" fill="#10B981" fillOpacity="0.25" />
        </g>
      ))}

      {/* Particule dorée centrale */}
      <circle cx="210" cy="100" r="5" fill="#F59E0B" />
      <circle cx="210" cy="100" r="10" fill="#F59E0B" fillOpacity="0.2" />
    </svg>
  )
}

export function NatureTopoPattern({ className = '' }) {
  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="nt-core" cx="30%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.32" />
          <stop offset="70%" stopColor="#1E3A8A" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0B1324" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="220" fill="#0B1324" />
      <circle cx="120" cy="90" r="130" fill="url(#nt-core)" />

      {/* Lignes d'isovaleurs / courbes de niveau topologiques continues */}
      <g fill="none" stroke="#60A5FA" strokeWidth="1.2">
        <path d="M -20,170 C 60,160 100,200 190,160 C 270,120 330,170 420,130" strokeOpacity="0.2" />
        <path d="M -20,140 C 70,130 120,170 200,135 C 280,100 320,140 420,105" strokeOpacity="0.3" />
        <path d="M -20,110 C 80,95 130,140 210,110 C 290,80 320,115 420,80" strokeOpacity="0.45" strokeWidth="1.4" />
        <path d="M -20,80 C 90,65 140,110 220,85 C 300,60 330,90 420,55" strokeOpacity="0.6" strokeWidth="1.6" />
        <path d="M -20,50 C 100,35 150,80 230,60 C 310,40 340,65 420,30" strokeOpacity="0.35" />
      </g>

      {/* Îlots de relief / ellipsoïdes topologiques fermés */}
      <g fill="none" stroke="#93C5FD" strokeOpacity="0.4" strokeWidth="1.1">
        <ellipse cx="140" cy="85" rx="55" ry="28" strokeOpacity="0.5" strokeWidth="1.3" />
        <ellipse cx="140" cy="85" rx="35" ry="18" strokeOpacity="0.65" strokeWidth="1.5" />
        <ellipse cx="140" cy="85" rx="18" ry="9" strokeOpacity="0.8" strokeWidth="1.6" />
        <circle cx="140" cy="85" r="2.5" fill="#FFFFFF" />
      </g>

      <g fill="none" stroke="#F43F5E" strokeOpacity="0.4" strokeWidth="1.1">
        <ellipse cx="290" cy="140" rx="45" ry="22" strokeOpacity="0.4" />
        <ellipse cx="290" cy="140" rx="25" ry="12" strokeOpacity="0.55" strokeWidth="1.3" />
        <circle cx="290" cy="140" r="2" fill="#F43F5E" />
      </g>
    </svg>
  )
}

// Composant dispatcheur principal pour respecter react-refresh (n'exporte que des composants)
export default function ScientificPattern({ patternKey, className = '' }) {
  if (patternKey === 'arxiv_graph') return <ArxivGraphPattern className={className} />
  if (patternKey === 'nature_quantum') return <NatureQuantumPattern className={className} />
  if (patternKey === 'nature_lattice') return <NatureLatticePattern className={className} />
  if (patternKey === 'nature_topo') return <NatureTopoPattern className={className} />
  return <ArxivGraphPattern className={className} />
}
