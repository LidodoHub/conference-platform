import { supabase } from './supabaseClient'

/**
 * Update event status. Prefers the `events` Edge Function when present,
 * then falls back to a direct table update on the existing events.status column.
 */
export async function updateEventStatus(eventId, status, action = 'update_status') {
  try {
    const { data, error } = await supabase.functions.invoke('events', {
      body: { id: eventId, status, action },
    })

    if (!error && data && !data.error) {
      return { data, error: null }
    }
  } catch {
    /* Edge Function absent or unreachable — use the table. */
  }

  const { data, error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId)
    .select()
    .single()

  return { data, error }
}

export async function archiveEvent(eventId) {
  return updateEventStatus(eventId, 'archived', 'archive')
}

export async function restoreEvent(eventId) {
  return updateEventStatus(eventId, 'published', 'restore')
}

export async function fetchEvents({ archived = false } = {}) {
  let query = supabase
    .from('events')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false })

  query = archived
    ? query.eq('status', 'archived')
    : query.neq('status', 'archived')

  return query
}
