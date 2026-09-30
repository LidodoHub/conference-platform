const STOP = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'were',
  'les', 'des', 'une', 'dans', 'pour', 'avec', 'sur', 'par', 'plus', 'aux',
  'est', 'sont', 'ces', 'qui', 'que', 'dont', 'entre', 'sous',
])

export function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !STOP.has(token))
}

export function termFreq(tokens) {
  const freq = new Map()
  tokens.forEach((token) => freq.set(token, (freq.get(token) || 0) + 1))
  return freq
}

export function cosine(a, b) {
  const keys = new Set([...a.keys(), ...b.keys()])
  let dot = 0
  let na = 0
  let nb = 0
  keys.forEach((key) => {
    const va = a.get(key) || 0
    const vb = b.get(key) || 0
    dot += va * vb
    na += va * va
    nb += vb * vb
  })
  if (!na || !nb) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}
