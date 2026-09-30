import { tokenize } from './text'

function shingles(tokens, size = 3) {
  const set = new Set()
  for (let i = 0; i <= tokens.length - size; i += 1) {
    set.add(tokens.slice(i, i + size).join(' '))
  }
  return set
}

function jaccard(a, b) {
  if (!a.size && !b.size) return 0
  let inter = 0
  a.forEach((item) => {
    if (b.has(item)) inter += 1
  })
  return inter / (a.size + b.size - inter)
}

/** Pairwise n-gram overlap — local reuse of the PFE plagiarism heuristic. */
export function detectPlagiarism(submissions, threshold = 0.28) {
  const docs = submissions.map((item) => ({
    id: item.id,
    title: item.title,
    shingles: shingles(tokenize(`${item.title} ${item.abstract || ''}`)),
  }))

  const pairs = []
  for (let i = 0; i < docs.length; i += 1) {
    for (let j = i + 1; j < docs.length; j += 1) {
      const score = jaccard(docs[i].shingles, docs[j].shingles)
      if (score >= threshold) {
        pairs.push({
          a: docs[i],
          b: docs[j],
          score,
        })
      }
    }
  }
  return pairs.sort((x, y) => y.score - x.score)
}
