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
  const x1 = 5 + (h % 50)
  const y1 = (h >> 3) % 60
  const cx = 55 + ((h >> 7) % 45)
  const cy = 15 + ((h >> 11) % 70)
  return {
    backgroundColor: p.base,
    backgroundImage: [
      // trame de points fine
      'radial-gradient(rgb(255 255 255 / 0.09) 1px, transparent 1.3px)',
      // cercles concentriques, comme un tampon de conférence
      `repeating-radial-gradient(circle at ${cx}% ${cy}%, transparent 0 22px, ${p.b}2e 22px 23px)`,
      `radial-gradient(70% 90% at ${x1}% ${y1}%, ${p.a}, transparent 70%)`,
      `radial-gradient(40% 60% at ${cx}% ${cy}%, ${p.b}66, transparent 70%)`,
      `linear-gradient(160deg, transparent 40%, rgb(0 0 0 / 0.35))`,
    ].join(', '),
    backgroundSize: '14px 14px, 100% 100%, 100% 100%, 100% 100%, 100% 100%',
  }
}
