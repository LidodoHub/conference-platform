const AI_API_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_AI_API_URL ||
  'http://localhost:8000'
).replace(/\/+$/, '')

const OFFLINE_MESSAGE = 'Serveur IA hors ligne — lancez `uvicorn api.main:app --reload`'

async function requestAI(path, options = {}) {
  let response
  try {
    response = await fetch(`${AI_API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    })
  } catch {
    throw new Error(OFFLINE_MESSAGE)
  }

  if (!response.ok) {
    let detail = ''
    try {
      const data = await response.json()
      detail = typeof data?.detail === 'string' ? data.detail : ''
    } catch {
      // ignorer si la réponse n'est pas en JSON
    }
    throw new Error(detail || `Erreur du serveur IA (${response.status}).`)
  }

  return response.json()
}

export function checkAiHealth() {
  return requestAI('/api/health', { method: 'GET' })
}

export function runAiMatching({ submissions, reviewers, maxLoad = 3, reviewersPerSubmission = 2 }) {
  return requestAI('/api/ai/matching', {
    method: 'POST',
    body: JSON.stringify({
      submissions,
      reviewers,
      max_load: maxLoad,
      reviewers_per_submission: reviewersPerSubmission,
    }),
  })
}

export function runAiSimilarity({ submissions, threshold = 0.65 }) {
  return requestAI('/api/ai/similarity', {
    method: 'POST',
    body: JSON.stringify({
      submissions,
      threshold,
    }),
  })
}

export function runQuboScheduling({
  sessions,
  rooms,
  timeslots,
  solver = 'exact',
  isDemoFallback = false,
}) {
  return requestAI('/api/ai/qubo', {
    method: 'POST',
    body: JSON.stringify({
      sessions,
      rooms,
      timeslots,
      solver,
      is_demo_fallback: isDemoFallback,
    }),
  })
}

export function generateMetaReview({ title, abstract = '', reviews }) {
  return requestAI('/api/ai/meta-review', {
    method: 'POST',
    body: JSON.stringify({
      title,
      abstract,
      reviews,
    }),
  })
}

export function indexRag({ scope = 'all', eventId = null } = {}) {
  return requestAI('/rag/index', {
    method: 'POST',
    body: JSON.stringify({
      scope,
      event_id: eventId,
    }),
  })
}

export function askRag({ query, scope, eventId = null, lang = 'fr' }) {
  return requestAI('/rag/ask', {
    method: 'POST',
    body: JSON.stringify({
      query,
      scope,
      event_id: eventId,
      lang,
    }),
  })
}
