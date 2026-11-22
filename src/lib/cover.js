// Système de couverture visuelle CONFERA :
// 1. Photos thématiques scientifiques réelles en bichromie/duotone (haute résolution, Unsplash / Wikimedia)
// 2. Illustrations scientifiques vectorielles génératives modernes (style Nature / ArXiv / IEEE)
//    -> Utilisées par défaut lorsqu'aucun mot-clé scientifique spécifique n'est détecté (ex. "test_event")
// 3. Détection intelligente automatique et zéro latence de commutation
// 4. Personnalisation par l'organisateur (choix de thème ou image d'affiche personnalisée)

export const GENERATIVE_THEMES = {
  arxiv_graph: {
    id: 'arxiv_graph',
    label: 'ArXiv Graph (Réseaux & IA)',
    desc: 'Topologie de graphes, réseaux neuronaux & clusters de données',
    isGenerative: true,
    patternKey: 'arxiv_graph',
    color: '#16233F',
    accent: '#C8963E',
    badge: 'Illustration ArXiv',
  },
  nature_quantum: {
    id: 'nature_quantum',
    label: 'Nature Quantum (Ondes & Laser)',
    desc: 'Ondes de probabilité quantique, interférences & harmoniques',
    isGenerative: true,
    patternKey: 'nature_quantum',
    color: '#0B091A',
    accent: '#A855F7',
    badge: 'Illustration Nature',
  },
  nature_lattice: {
    id: 'nature_lattice',
    label: 'Nature Lattice (Molécules & Matière)',
    desc: 'Maillages cristallins, géométrie moléculaire & nanomatériaux',
    isGenerative: true,
    patternKey: 'nature_lattice',
    color: '#061A16',
    accent: '#10B981',
    badge: 'Illustration Nature',
  },
  nature_topo: {
    id: 'nature_topo',
    label: 'Nature Topo (Géodésie & Maths)',
    desc: 'Courbes de niveau isovaleurs, variété différentielle & flux',
    isGenerative: true,
    patternKey: 'nature_topo',
    color: '#0B1324',
    accent: '#3B82F6',
    badge: 'Illustration ArXiv',
  },
}

export const PHOTO_THEMES = {
  ai: {
    id: 'ai',
    label: 'IA & Numérique',
    desc: 'Informatique, data science, algorithmique, robotique & IoT',
    keywords: [
      'ia', 'ai', 'intelligence', 'artificiel', 'donnees', 'data', 'informatique',
      'cyber', 'code', 'cloud', 'logiciel', 'algorithme', 'machine', 'deep', 'vision',
      'robotique', 'iot', 'reseau', 'web', 'systeme', 'software', 'embarque', 'computation'
    ],
    photo: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    color: '#0e1d38',
    accent: '#3D6FB0',
    badge: 'Photo • IA & Numérique',
  },
  bio: {
    id: 'bio',
    label: 'Biotechnologie & Santé',
    desc: 'Médecine, pharmacie, génétique, bio-ingénierie & chimie',
    keywords: [
      'bio', 'sante', 'medic', 'biotech', 'genetique', 'chimie', 'molecule',
      'pharma', 'vie', 'medical', 'clinique', 'laboratoire', 'adn', 'cellule',
      'cancer', 'therapie', 'biologique', 'environnemental', 'agronomie'
    ],
    photo: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=1200&q=80',
    color: '#102e26',
    accent: '#2A8E66',
    badge: 'Photo • Biotechnologie',
  },
  energy: {
    id: 'energy',
    label: 'Énergies & Climat',
    desc: 'Énergies renouvelables, hydrogène, solaire, écologie & transition',
    keywords: [
      'energie', 'renouvelable', 'solaire', 'eolien', 'environnement', 'ecologie',
      'climat', 'vert', 'durable', 'carbone', 'transition', 'eau', 'ressources',
      'hydrogene', 'photovoltaique', 'thermique', 'developpement'
    ],
    photo: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
    color: '#122c2a',
    accent: '#2F6F62',
    badge: 'Photo • Énergies & Climat',
  },
  physics: {
    id: 'physics',
    label: 'Physique & Mathématiques',
    desc: 'Physique quantique, matériaux, nanotechnologies & modélisation',
    keywords: [
      'physique', 'math', 'quantique', 'optique', 'nanotech', 'electronique',
      'laser', 'matiere', 'particules', 'astronomie', 'algebre', 'theorie',
      'mecanique', 'ondes', 'semiconducteurs', 'modelisation'
    ],
    photo: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80',
    color: '#1c1630',
    accent: '#7B6BAE',
    badge: 'Photo • Sciences Fondamentales',
  },
  civil: {
    id: 'civil',
    label: 'Génie Civil & Architecture',
    desc: 'Structures, urbanisme, matériaux de construction & géotechnique',
    keywords: [
      'civil', 'batiment', 'architecture', 'structure', 'urbanisme', 'materiaux',
      'pont', 'beton', 'construction', 'geotechnique', 'infrastructures', 'travaux',
      'sismique', 'sol', 'amenagement'
    ],
    photo: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    color: '#241f19',
    accent: '#C8963E',
    badge: 'Photo • Génie Civil',
  },
  campus: {
    id: 'campus',
    label: 'Campus & Amphi USTO',
    desc: 'Colloques généraux, symposiums de recherche & journées d’études',
    keywords: [
      'usto', 'oran', 'campus', 'universite', 'colloque', 'seminaire', 'journee',
      'academique', 'recherche', 'etude', 'symposium', 'doctorat', 'etudiants'
    ],
    photo: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    color: '#131e33',
    accent: '#D2A24E',
    badge: 'Photo • Campus USTO',
  },
}

export const THEMES = {
  ...GENERATIVE_THEMES,
  ...PHOTO_THEMES,
}

const GENERATIVE_KEYS = Object.keys(GENERATIVE_THEMES)

export function hashOf(text) {
  let h = 2166136261
  for (const ch of String(text || '')) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function cleanDescription(desc) {
  if (!desc) return ''
  return String(desc).replace(/<!--\s*cover:[\s\S]*?-->/g, '').trim()
}

export function extractCoverKey(desc) {
  if (!desc) return null
  const match = String(desc).match(/<!--\s*cover:([^>]+)-->/)
  return match ? match[1].trim() : null
}

export function detectTheme(eventOrSeed) {
  if (!eventOrSeed) return GENERATIVE_THEMES.arxiv_graph

  // Si un objet événement est fourni
  if (typeof eventOrSeed === 'object') {
    // 0. Si un themeKey direct est fourni (ex: prévisualisation du formulaire)
    if (eventOrSeed.themeKey) {
      if (THEMES[eventOrSeed.themeKey]) return THEMES[eventOrSeed.themeKey]
    }

    // 1. Couverture directe explicite (propriété de l'événement)
    if (eventOrSeed.cover_url) {
      // Si la cover_url correspond directement à un thème connu
      const matched = Object.values(THEMES).find((t) => t.photo === eventOrSeed.cover_url)
      if (matched) return matched
      return {
        id: 'custom',
        custom: true,
        photo: eventOrSeed.cover_url,
        label: 'Affiche Officielle',
        color: '#101d36',
        accent: '#D2A24E',
      }
    }

    // 2. Thème ou URL stocké dans la description <!-- cover:... -->
    const explicitKey = extractCoverKey(eventOrSeed.description)
    if (explicitKey) {
      if (THEMES[explicitKey]) return THEMES[explicitKey]
      if (explicitKey.startsWith('http://') || explicitKey.startsWith('https://') || explicitKey.startsWith('data:')) {
        return {
          id: 'custom',
          custom: true,
          photo: explicitKey,
          label: 'Affiche Officielle',
          color: '#101d36',
          accent: '#D2A24E',
        }
      }
    }

    // 3. Clé sauvegardée localement (confort immédiat)
    if (typeof window !== 'undefined' && eventOrSeed.id) {
      try {
        const local = localStorage.getItem(`confera_cover_${eventOrSeed.id}`)
        if (local) {
          if (THEMES[local]) return THEMES[local]
          if (local.startsWith('http')) {
            return {
              id: 'custom',
              custom: true,
              photo: local,
              label: 'Affiche Officielle',
              color: '#101d36',
              accent: '#D2A24E',
            }
          }
        }
      } catch {
        // ignorer en SSR ou sandbox
      }
    }

    // 4. Analyse lexicale des mots-clés :
    // On nettoie le texte pour chercher des correspondances scientifiques fortes
    const rawText = `${eventOrSeed.title || ''} ${cleanDescription(eventOrSeed.description) || ''}`
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim()

    // Vérifier les thématiques photos spécialisées (IA, Bio, Énergies, Physique, Civil, Campus)
    for (const theme of Object.values(PHOTO_THEMES)) {
      if (theme.keywords.some((kw) => rawText.includes(kw))) {
        return theme
      }
    }

    // 5. PAR DÉFAUT SI AUCUN MOT-CLÉ SCIENTIFIQUE (ex. "test_event", titre arbitraire, etc.) :
    // -> Attribuer une illustration scientifique générative moderne (Style Nature / ArXiv) !
    const h = hashOf(eventOrSeed.id || eventOrSeed.title || 'default-seed')
    const defaultGenKey = GENERATIVE_KEYS[h % GENERATIVE_KEYS.length]
    return GENERATIVE_THEMES[defaultGenKey]
  }

  // Si c'est une chaîne de caractères (seed ou mot-clé)
  if (THEMES[eventOrSeed]) return THEMES[eventOrSeed]
  if (String(eventOrSeed).startsWith('http')) {
    return { id: 'custom', custom: true, photo: eventOrSeed, color: '#101d36', accent: '#D2A24E' }
  }

  // Fallback génératif basé sur la graine
  const h = hashOf(eventOrSeed)
  const defaultGenKey = GENERATIVE_KEYS[h % GENERATIVE_KEYS.length]
  return GENERATIVE_THEMES[defaultGenKey]
}

export function coverStyle(seed) {
  const theme = detectTheme(seed)
  const h = hashOf(typeof seed === 'object' ? seed.id || seed.title : seed)
  const cx = 55 + ((h >> 7) % 45)
  const cy = 15 + ((h >> 11) % 70)
  const x1 = 5 + (h % 50)
  const y1 = (h >> 3) % 60

  return {
    backgroundColor: theme.color,
    backgroundImage: [
      'radial-gradient(rgb(255 255 255 / 0.12) 1px, transparent 1.3px)',
      `repeating-radial-gradient(circle at ${cx}% ${cy}%, transparent 0 22px, ${theme.accent}33 22px 23px)`,
      `radial-gradient(70% 90% at ${x1}% ${y1}%, ${theme.accent}66, transparent 70%)`,
      `radial-gradient(40% 60% at ${cx}% ${cy}%, ${theme.accent}88, transparent 70%)`,
      'linear-gradient(160deg, transparent 35%, rgb(0 0 0 / 0.55))',
    ].join(', '),
    backgroundSize: '14px 14px, 100% 100%, 100% 100%, 100% 100%, 100% 100%',
  }
}
