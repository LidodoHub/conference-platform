import { supabase } from './supabaseClient'

const PREFIX = 'confera:v1:'

function storageKey(table, eventId) {
  return `${PREFIX}${table}:${eventId}`
}

function readLocal(table, eventId) {
  try {
    const raw = localStorage.getItem(storageKey(table, eventId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeLocal(table, eventId, rows) {
  localStorage.setItem(storageKey(table, eventId), JSON.stringify(rows))
}

function isMissingTable(error) {
  if (!error) return false
  const msg = `${error.message} ${error.code || ''} ${error.details || ''}`.toLowerCase()
  return (
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    error.code === '42P01' ||
    error.code === 'PGRST205'
  )
}

/** Load rows from a Supabase table, or local fallback if the table is not in the schema. */
export async function loadRecords(table, eventId) {
  const { data, error } = await supabase.from(table).select('*').eq('event_id', eventId)
  if (!error) return { rows: data || [], source: 'supabase' }
  if (isMissingTable(error)) {
    return { rows: readLocal(table, eventId), source: 'local' }
  }
  return { rows: readLocal(table, eventId), source: 'local', error }
}

export async function insertRecord(table, eventId, payload) {
  const row = {
    id: crypto.randomUUID(),
    event_id: eventId,
    created_at: new Date().toISOString(),
    ...payload,
  }

  const { data, error } = await supabase.from(table).insert(row).select().single()
  if (!error && data) return { row: data, source: 'supabase' }

  if (error && !isMissingTable(error)) {
    const local = readLocal(table, eventId)
    local.unshift(row)
    writeLocal(table, eventId, local)
    return { row, source: 'local', error }
  }

  const local = readLocal(table, eventId)
  local.unshift(row)
  writeLocal(table, eventId, local)
  return { row, source: 'local' }
}

export async function updateRecord(table, eventId, id, patch) {
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single()
  if (!error && data) return { row: data, source: 'supabase' }

  const local = readLocal(table, eventId).map((item) =>
    item.id === id ? { ...item, ...patch } : item,
  )
  writeLocal(table, eventId, local)
  return { row: local.find((item) => item.id === id), source: 'local' }
}

export async function deleteRecord(table, eventId, id) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (!error) return { source: 'supabase' }

  const local = readLocal(table, eventId).filter((item) => item.id !== id)
  writeLocal(table, eventId, local)
  return { source: 'local' }
}
