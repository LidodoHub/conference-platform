// Thème clair / sombre / système. Préférence locale au navigateur (simple confort, pas une donnée).
const KEY = 'confera:theme'

export function readThemePref() {
  try {
    return localStorage.getItem(KEY) || 'system'
  } catch {
    return 'system'
  }
}

export function resolveTheme(pref) {
  if (pref === 'light' || pref === 'dark') return pref
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(pref) {
  document.documentElement.dataset.theme = resolveTheme(pref)
  try {
    if (pref === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, pref)
  } catch {
    // stockage indisponible : le thème reste valable pour la session
  }
}
