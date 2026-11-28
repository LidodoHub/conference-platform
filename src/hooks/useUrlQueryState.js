import { useState, useEffect, useCallback } from 'react'

const URL_CHANGE_EVENT = 'confera:url-changed'

/**
 * Synchronise les paramètres de requête (?view=, ?tab=, ?lab=, ?network=, ?paper=, etc.)
 * avec l'historique du navigateur sans recharger ni ré-animer la page.
 */
export function useUrlQueryState() {
  const [search, setSearch] = useState(() =>
    typeof window !== 'undefined' ? window.location.search : '',
  )

  useEffect(() => {
    const syncFromLocation = () => {
      setSearch(window.location.search)
    }
    window.addEventListener('popstate', syncFromLocation)
    window.addEventListener(URL_CHANGE_EVENT, syncFromLocation)
    return () => {
      window.removeEventListener('popstate', syncFromLocation)
      window.removeEventListener(URL_CHANGE_EVENT, syncFromLocation)
    }
  }, [])

  const searchParams = new URLSearchParams(search)

  const setSearchParams = useCallback((updater, { replace = false } = {}) => {
    if (typeof window === 'undefined') return
    const current = new URLSearchParams(window.location.search)
    const next = typeof updater === 'function' ? updater(current) : new URLSearchParams(updater)
    const str = next.toString()
    const nextSearch = str ? `?${str}` : ''
    if (window.location.search === nextSearch) return
    const nextUrl = `${window.location.pathname}${nextSearch}`
    if (replace) window.history.replaceState(null, '', nextUrl)
    else window.history.pushState(null, '', nextUrl)
    setSearch(nextSearch)
    window.dispatchEvent(new Event(URL_CHANGE_EVENT))
  }, [])

  return [searchParams, setSearchParams]
}
