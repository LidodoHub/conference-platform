import { tokenize, termFreq, cosine } from './text'

/** Lightweight topic clustering (k-means on bag-of-words). */
export function clusterSubmissions(submissions, k = 3) {
  if (!submissions.length) return []

  const vectors = submissions.map((item) => ({
    id: item.id,
    title: item.title,
    vec: termFreq(tokenize(`${item.title} ${item.abstract || ''}`)),
  }))

  const clusterCount = Math.min(k, vectors.length)
  let centroids = vectors.slice(0, clusterCount).map((item) => new Map(item.vec))

  for (let round = 0; round < 8; round += 1) {
    const buckets = Array.from({ length: clusterCount }, () => [])
    vectors.forEach((item) => {
      let best = 0
      let bestScore = -1
      centroids.forEach((centroid, index) => {
        const score = cosine(item.vec, centroid)
        if (score > bestScore) {
          bestScore = score
          best = index
        }
      })
      buckets[best].push(item)
    })

    centroids = buckets.map((bucket, index) => {
      if (!bucket.length) return centroids[index]
      const merged = new Map()
      bucket.forEach((item) => {
        item.vec.forEach((value, key) => merged.set(key, (merged.get(key) || 0) + value))
      })
      return merged
    })
  }

  return centroids.map((centroid, index) => {
    const members = vectors
      .map((item) => ({ ...item, score: cosine(item.vec, centroid) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)

    const topTerms = [...centroid.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([term]) => term)

    return {
      id: index + 1,
      label: topTerms.slice(0, 2).join(' / ') || `Thème ${index + 1}`,
      terms: topTerms,
      papers: members.slice(0, 8).map((item) => ({ id: item.id, title: item.title })),
    }
  }).filter((cluster) => cluster.papers.length)
}
