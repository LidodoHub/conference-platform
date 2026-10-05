// Couverture graphique d'un événement, déterministe : même identifiant = même couverture.
// Dégradés et trame aux couleurs de la charte, aucune image externe.

const PALETTES = [
  { base: '#1B2A4A', a: '#2F6F62', b: '#C8963E' }, // marine, sauge, or
  { base: '#14324A', a: '#2B5E86', b: '#D2A24E' }, // bleu de Prusse
  { base: '#1E3A33', a: '#2F6F62', b: '#C8963E' }, // vert profond
  { base: '#2A2338', a: '#4A3F6B', b: '#D2A24E' }, // encre
  { base: '#2B2A26', a: '#6B5631', b: '#E3BC72' }, // bronze
  { base: '#132238', a: '#1F4E5F', b: '#9FC9B9' }, // ardoise et menthe
]

export function hashOf(text) {
  let h = 2166136261
  for (const ch of String(text || '')) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function coverStyle(seed) {
  const h = hashOf(seed)
  const p = PALETTES[h % PALETTES.length]
  const x1 = 10 + (h % 60)
  const y1 = (h >> 3) % 70
  const x2 = 50 + ((h >> 7) % 50)
  const y2 = 40 + ((h >> 11) % 60)
  const angle = 20 + ((h >> 13) % 140)
  return {
    backgroundColor: p.base,
    backgroundImage: [
      // trame de points fine
      'radial-gradient(rgb(255 255 255 / 0.10) 1px, transparent 1.2px)',
      // un filet doré en diagonale
      `linear-gradient(${angle}deg, transparent 49.6%, ${p.b}55 49.8%, ${p.b}55 50.2%, transparent 50.4%)`,
      `radial-gradient(60% 80% at ${x1}% ${y1}%, ${p.a}cc, transparent 70%)`,
      `radial-gradient(45% 70% at ${x2}% ${y2}%, ${p.b}55, transparent 70%)`,
    ].join(', '),
    backgroundSize: '14px 14px, 100% 100%, 100% 100%, 100% 100%',
  }
}
