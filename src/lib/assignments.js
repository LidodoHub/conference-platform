import { supabase } from './supabaseClient'

export const assignmentStorageKey = (eventId) => `confera_ai_assignments_${eventId}`

export function loadLocalAssignmentMap(eventId) {
  try {
    const raw = localStorage.getItem(assignmentStorageKey(eventId))
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveLocalAssignmentMap(eventId, map) {
  try {
    localStorage.setItem(assignmentStorageKey(eventId), JSON.stringify(map))
  } catch {
    // ignorer si stockage indisponible
  }
}

/**
 * Charge les affectations reviewers -> soumissions depuis Supabase (`review_assignments`)
 * avec repli sur le stockage local si la table n'est pas encore créée.
 */
export async function fetchEventAssignments(eventId, participants = []) {
  const localMap = loadLocalAssignmentMap(eventId)
  const nameById = Object.fromEntries(
    participants.map((p) => [
      String(p.user_id || p.profiles?.id),
      p.profiles?.full_name || p.profiles?.email || 'Reviewer',
    ]),
  )

  const { data, error } = await supabase
    .from('review_assignments')
    .select('submission_id, reviewer_id, assigned_at, profiles(id, full_name, email)')
    .eq('event_id', eventId)

  if (!error && Array.isArray(data)) {
    const mergedMap = { ...localMap }
    const rows = data.map((row) => {
      const subId = String(row.submission_id)
      const revId = String(row.reviewer_id)
      mergedMap[`${subId}:${revId}`] = true
      return {
        submission_id: subId,
        reviewer_id: revId,
        reviewer_name: row.profiles?.full_name || row.profiles?.email || nameById[revId] || 'Reviewer',
        assigned_at: row.assigned_at,
      }
    })
    return { list: rows, map: mergedMap, fromSupabase: true }
  }

  // Repli local si la table review_assignments n'existe pas encore
  const list = Object.entries(localMap)
    .filter(([, active]) => Boolean(active))
    .map(([key]) => {
      const [submission_id, reviewer_id] = key.split(':')
      return {
        submission_id,
        reviewer_id,
        reviewer_name: nameById[reviewer_id] || 'Reviewer',
      }
    })
    .filter((item) => item.submission_id && item.reviewer_id)

  return { list, map: localMap, fromSupabase: false }
}

export async function assignReviewer(eventId, submissionId, reviewerId) {
  const key = `${submissionId}:${reviewerId}`
  const next = { ...loadLocalAssignmentMap(eventId), [key]: true }
  saveLocalAssignmentMap(eventId, next)

  try {
    await supabase
      .from('review_assignments')
      .upsert(
        { event_id: eventId, submission_id: submissionId, reviewer_id: reviewerId },
        { onConflict: 'submission_id,reviewer_id' },
      )
  } catch {
    // Repli local déjà enregistré
  }
  return next
}

export async function unassignReviewer(eventId, submissionId, reviewerId) {
  const key = `${submissionId}:${reviewerId}`
  const next = { ...loadLocalAssignmentMap(eventId) }
  delete next[key]
  saveLocalAssignmentMap(eventId, next)

  try {
    await supabase
      .from('review_assignments')
      .delete()
      .eq('submission_id', submissionId)
      .eq('reviewer_id', reviewerId)
  } catch {
    // Repli local déjà mis à jour
  }
  return next
}
