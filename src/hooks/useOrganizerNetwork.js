import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/auth'

const STORAGE_PREFIX = 'confera_network_'
const SYNC_EVENT = 'confera:network-changed'

function readSavedIds(userId) {
  if (!userId) return []
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

function writeSavedIds(userId, ids) {
  if (!userId) return
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(ids))
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { userId, ids } }))
  } catch {
    // ignore storage errors
  }
}

/**
 * Gère le réseau unidirectionnel d'un organisateur/admin :
 * - favoris privés (localStorage par user.id)
 * - anciens collaborateurs (reviewers & co-organisateurs d'événements précédents)
 * - liste des événements passés pour l'import rapide
 */
export function useOrganizerNetwork() {
  const { user, isAdmin } = useAuth()
  const userId = user?.id || null

  const [savedList, setSavedList] = useState(() => readSavedIds(userId))
  const [pastEvents, setPastEvents] = useState([])
  const [savedProfiles, setSavedProfiles] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSavedList(readSavedIds(userId))
  }, [userId])

  useEffect(() => {
    if (!userId) return undefined
    const onSync = (e) => {
      if (e.detail?.userId === userId) {
        setSavedList(e.detail.ids)
      }
    }
    window.addEventListener(SYNC_EVENT, onSync)
    return () => window.removeEventListener(SYNC_EVENT, onSync)
  }, [userId])

  const savedIds = useMemo(() => new Set(savedList), [savedList])

  const isSaved = useCallback((id) => savedIds.has(id), [savedIds])

  const toggleSave = useCallback(
    (id) => {
      if (!userId || !id || id === userId) return
      setSavedList((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        writeSavedIds(userId, next)
        return next
      })
    },
    [userId],
  )

  const loadNetwork = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      let eventsQuery = supabase
        .from('events')
        .select(
          'id, title, start_date, status, organizer_id, event_participants(user_id, role_in_event, profiles(id, full_name, email, affiliation, role))',
        )
        .order('start_date', { ascending: false })

      if (!isAdmin) {
        const { data: orgRows } = await supabase
          .from('event_participants')
          .select('event_id')
          .eq('user_id', userId)
          .eq('role_in_event', 'organizer')

        const orgEventIds = (orgRows || []).map((r) => r.event_id)
        if (orgEventIds.length > 0) {
          eventsQuery = eventsQuery.or(`organizer_id.eq.${userId},id.in.(${orgEventIds.join(',')})`)
        } else {
          eventsQuery = eventsQuery.eq('organizer_id', userId)
        }
      }

      const { data: eventsData } = await eventsQuery
      const formattedEvents = (eventsData || []).map((ev) => ({
        id: ev.id,
        title: ev.title,
        start_date: ev.start_date,
        status: ev.status,
        members: (ev.event_participants || [])
          .filter(
            (p) =>
              p.user_id &&
              p.user_id !== userId &&
              ['reviewer', 'organizer'].includes(p.role_in_event) &&
              p.profiles,
          )
          .map((p) => ({
            id: p.profiles.id,
            full_name: p.profiles.full_name,
            email: p.profiles.email,
            affiliation: p.profiles.affiliation,
            role_in_event: p.role_in_event,
          })),
      }))
      setPastEvents(formattedEvents)
    } finally {
      setLoading(false)
    }
  }, [userId, isAdmin])

  useEffect(() => {
    loadNetwork()
  }, [loadNetwork])

  // Anciens collaborateurs dédupliqués
  const pastCollaborators = useMemo(() => {
    const map = new Map()
    pastEvents.forEach((ev) => {
      ev.members.forEach((m) => {
        if (!map.has(m.id)) {
          map.set(m.id, {
            id: m.id,
            full_name: m.full_name,
            email: m.email,
            affiliation: m.affiliation,
            events: [],
          })
        }
        const entry = map.get(m.id)
        if (!entry.events.some((e) => e.id === ev.id)) {
          entry.events.push({ id: ev.id, title: ev.title })
        }
      })
    })
    return Array.from(map.values())
  }, [pastEvents])

  const collaboratorIds = useMemo(
    () => new Set(pastCollaborators.map((c) => c.id)),
    [pastCollaborators],
  )

  const isPastCollaborator = useCallback((id) => collaboratorIds.has(id), [collaboratorIds])

  // Charge les profils des favoris qui ne figurent pas encore dans les anciens collaborateurs
  useEffect(() => {
    const missing = savedList.filter((id) => !collaboratorIds.has(id))
    if (missing.length === 0) {
      setSavedProfiles([])
      return
    }
    let cancelled = false
    supabase
      .from('profiles')
      .select('id, full_name, email, affiliation, role')
      .in('id', missing)
      .then(({ data }) => {
        if (!cancelled && data) setSavedProfiles(data)
      })
    return () => {
      cancelled = true
    }
  }, [savedList, collaboratorIds])

  // Liste unifiée : favoris + anciens collaborateurs
  const networkMembers = useMemo(() => {
    const map = new Map()
    pastCollaborators.forEach((c) => {
      map.set(c.id, {
        ...c,
        isSaved: savedIds.has(c.id),
        isCollaborator: true,
      })
    })
    savedProfiles.forEach((p) => {
      if (!map.has(p.id)) {
        map.set(p.id, {
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          affiliation: p.affiliation,
          events: [],
          isSaved: true,
          isCollaborator: false,
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => {
      if (a.isSaved !== b.isSaved) return a.isSaved ? -1 : 1
      return (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '')
    })
  }, [pastCollaborators, savedProfiles, savedIds])

  return {
    savedIds,
    isSaved,
    toggleSave,
    pastCollaborators,
    isPastCollaborator,
    pastEvents,
    networkMembers,
    loading,
    refresh: loadNetwork,
  }
}
