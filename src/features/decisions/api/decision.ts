import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getEventById } from '@/lib/events'

// POST /api/submissions/:submissionId/decisions - Prendre une décision (organizer)
export async function POST(
  request: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Vérifier que l'utilisateur est organizer de l'event de la soumission
  const submission = await supabase
    .from('submissions')
    .select('event_id, author_id')
    .eq('id', params.submissionId)
    .single()

  if (!submission.data) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  const userEvent = await supabase
    .from('events')
    .select('id, organizer_id')
    .eq('id', submission.data.event_id)
    .single()

  if (!userEvent.data) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // RLS check: organizer only
  if (user.id !== userEvent.data.organizer_id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await request.json()
  const { status, notes } = body

  if (!status || !['accepted', 'rejected', 'revision_requested'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('decisions')
    .upsert({
      submission_id: params.submissionId,
      decided_by: user.id,
      status,
      notes: notes || null,
      decided_at: new Date().toISOString(),
      notified_at: new Date().toISOString(),
    })
    .select('*, profiles(full_name)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// GET /api/submissions/:submissionId/decisions - Récupérer les décisions
export async function GET(
  request: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const submission = await supabase
    .from('submissions')
    .select('event_id, author_id')
    .eq('id', params.submissionId)
    .single()

  if (!submission.data) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  const userEvent = await supabase
    .from('events')
    .select('id, organizer_id')
    .eq('id', submission.data.event_id)
    .single()

  if (!userEvent.data) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // RLS check: organizer OR author of the submission
  const authorized =
    user.event_id === submission.data.event_id &&
    (user.role_in_event === 'organizer' || user.id === submission.data.author_id)

  if (!authorized) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('decisions')
    .select('*, profiles(full_name)')
    .eq('submission_id', params.submissionId)
    .order('decided_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
