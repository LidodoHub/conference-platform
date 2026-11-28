import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

const STORAGE_PREFIX = 'confera_counts_'

const PendingCountsContext = createContext({
  pendingCount: null,
  unreadNotifications: null,
  publicEventsCount: null,
  isLoading: false,
  refreshCounts: async () => {},
  setUnreadNotifications: () => {},
  setPendingCount: () => {},
})

function storageKey(userId) {
  return `${STORAGE_PREFIX}${userId}`
}

function readCachedCounts(userId) {
  if (!userId || typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(storageKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    return {
      pendingCount: typeof parsed.pendingCount === 'number' ? parsed.pendingCount : null,
      unreadNotifications: typeof parsed.unreadNotifications === 'number' ? parsed.unreadNotifications : null,
      publicEventsCount: typeof parsed.publicEventsCount === 'number' ? parsed.publicEventsCount : null,
    }
  } catch {
    return null
  }
}

function writeCachedCounts(userId, counts) {
  if (!userId || typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(storageKey(userId), JSON.stringify(counts))
  } catch {
    // ignore storage errors
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function clearCachedCounts(userId) {
  if (typeof window === 'undefined') return
  try {
    if (userId) {
      window.sessionStorage.removeItem(storageKey(userId))
      return
    }
    const keysToRemove = []
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const k = window.sessionStorage.key(i)
      if (k && k.startsWith(STORAGE_PREFIX)) keysToRemove.push(k)
    }
    keysToRemove.forEach((k) => window.sessionStorage.removeItem(k))
  } catch {
    // ignore storage errors
  }
}

async function fetchUserCounts(userId, isAdmin) {
  const [notifRes, partsRes, subsRes, pubRes] = await Promise.all([
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .is('read_at', null),
    supabase
      .from('event_participants')
      .select('event_id, role_in_event, registration_status, events(id, status, phase)')
      .eq('user_id', userId),
    supabase
      .from('submissions')
      .select('id, status, events(phase)')
      .eq('author_id', userId),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .in('status', ['published', 'ongoing']),
  ])

  const unreadNotifications = notifRes.error ? 0 : (notifRes.count || 0)
  const publicEventsCount = pubRes.error ? 0 : (pubRes.count || 0)

  const parts = (partsRes.data || []).filter((p) => p.events)
  const orgIds = parts.filter((p) => p.role_in_event === 'organizer').map((p) => p.event_id)
  const revIds = parts
    .filter((p) => p.role_in_event === 'reviewer' && p.events.phase === 'scientific')
    .map((p) => p.event_id)

  const empty = Promise.resolve({ data: [] })
  const [pendingSubsRes, paymentsRes, reviewRes, approvalsRes] = await Promise.all([
    orgIds.length
      ? supabase.from('submissions').select('id, event_id').in('event_id', orgIds).eq('status', 'submitted')
      : empty,
    orgIds.length
      ? supabase
          .from('event_participants')
          .select('id, event_id')
          .in('event_id', orgIds)
          .eq('registration_status', 'payment_submitted')
      : empty,
    revIds.length
      ? supabase
          .from('submissions')
          .select('id, event_id, author_id, reviews(reviewer_id)')
          .in('event_id', revIds)
          .eq('status', 'submitted')
      : empty,
    isAdmin
      ? supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval')
      : Promise.resolve({ count: 0 }),
  ])

  const groupEventCount = (rows) => new Set((rows || []).map((r) => r.event_id)).size

  const orgPaymentsTodos = groupEventCount(paymentsRes.data)
  const orgPendingTodos = groupEventCount(pendingSubsRes.data)
  const draftTodos = parts.filter((p) => p.role_in_event === 'organizer' && p.events?.status === 'draft').length

  const toReview = (reviewRes.data || []).filter(
    (s) => s.author_id !== userId && !(s.reviews || []).some((r) => r.reviewer_id === userId),
  )
  const reviewTodos = groupEventCount(toReview)

  const revisionTodos = (subsRes.data || []).filter(
    (s) => s.status === 'revision_requested' && s.events?.phase === 'scientific',
  ).length

  const invitedTodos = parts.filter(
    (p) => p.role_in_event === 'participant' && p.registration_status === 'invited',
  ).length

  const approvalTodos = isAdmin && (approvalsRes.count || 0) > 0 ? 1 : 0

  const pendingCount =
    orgPaymentsTodos +
    orgPendingTodos +
    draftTodos +
    reviewTodos +
    revisionTodos +
    invitedTodos +
    approvalTodos

  return {
    pendingCount,
    unreadNotifications,
    publicEventsCount,
  }
}

export function PendingCountsProvider({ userId, isAdmin, children }) {
  const cached = useMemo(() => readCachedCounts(userId), [userId])
  const [countsState, setCountsState] = useState(() => ({
    userId: userId || null,
    pendingCount: cached?.pendingCount ?? null,
    unreadNotifications: cached?.unreadNotifications ?? null,
    publicEventsCount: cached?.publicEventsCount ?? null,
    isLoading: Boolean(userId) && !cached,
  }))

  const prevUserIdRef = useRef(userId)

  const refreshCounts = useCallback(async () => {
    if (!userId) return
    try {
      const next = await fetchUserCounts(userId, isAdmin)
      writeCachedCounts(userId, next)
      setCountsState((prev) => {
        if (
          prev.userId === userId &&
          prev.pendingCount === next.pendingCount &&
          prev.unreadNotifications === next.unreadNotifications &&
          prev.publicEventsCount === next.publicEventsCount &&
          prev.isLoading === false
        ) {
          return prev
        }
        return {
          userId,
          ...next,
          isLoading: false,
        }
      })
    } catch {
      setCountsState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [userId, isAdmin])

  useEffect(() => {
    const prevUserId = prevUserIdRef.current
    if (prevUserId && prevUserId !== userId) {
      clearCachedCounts(prevUserId)
    }
    prevUserIdRef.current = userId

    if (!userId) {
      clearCachedCounts()
      return undefined
    }

    let cancelled = false
    fetchUserCounts(userId, isAdmin)
      .then((next) => {
        if (cancelled) return
        writeCachedCounts(userId, next)
        setCountsState({
          userId,
          ...next,
          isLoading: false,
        })
      })
      .catch(() => {
        if (cancelled) return
        setCountsState((prev) => ({ ...prev, isLoading: false }))
      })

    return () => {
      cancelled = true
    }
  }, [userId, isAdmin])

  const setUnreadNotifications = useCallback(
    (nextVal) => {
      if (!userId) return
      setCountsState((prev) => {
        const resolved = typeof nextVal === 'function' ? nextVal(prev.unreadNotifications) : nextVal
        if (prev.unreadNotifications === resolved && prev.userId === userId) return prev
        const updated = {
          pendingCount: prev.userId === userId ? prev.pendingCount : cached?.pendingCount ?? null,
          unreadNotifications: resolved,
          publicEventsCount: prev.userId === userId ? prev.publicEventsCount : cached?.publicEventsCount ?? null,
        }
        writeCachedCounts(userId, updated)
        return { userId, ...updated, isLoading: false }
      })
    },
    [userId, cached],
  )

  const setPendingCount = useCallback(
    (nextVal) => {
      if (!userId) return
      setCountsState((prev) => {
        const resolved = typeof nextVal === 'function' ? nextVal(prev.pendingCount) : nextVal
        if (prev.pendingCount === resolved && prev.userId === userId) return prev
        const updated = {
          pendingCount: resolved,
          unreadNotifications: prev.userId === userId ? prev.unreadNotifications : cached?.unreadNotifications ?? null,
          publicEventsCount: prev.userId === userId ? prev.publicEventsCount : cached?.publicEventsCount ?? null,
        }
        writeCachedCounts(userId, updated)
        return { userId, ...updated, isLoading: false }
      })
    },
    [userId, cached],
  )

  const activeCounts = useMemo(() => {
    if (!userId) {
      return {
        pendingCount: null,
        unreadNotifications: null,
        publicEventsCount: null,
        isLoading: false,
      }
    }
    if (countsState.userId === userId) {
      return {
        pendingCount: countsState.pendingCount,
        unreadNotifications: countsState.unreadNotifications,
        publicEventsCount: countsState.publicEventsCount,
        isLoading: countsState.isLoading,
      }
    }
    return {
      pendingCount: cached?.pendingCount ?? null,
      unreadNotifications: cached?.unreadNotifications ?? null,
      publicEventsCount: cached?.publicEventsCount ?? null,
      isLoading: !cached,
    }
  }, [userId, countsState, cached])

  const value = useMemo(
    () => ({
      ...activeCounts,
      refreshCounts,
      setUnreadNotifications,
      setPendingCount,
    }),
    [activeCounts, refreshCounts, setUnreadNotifications, setPendingCount],
  )

  return <PendingCountsContext.Provider value={value}>{children}</PendingCountsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePendingCounts() {
  return useContext(PendingCountsContext)
}
