import { useState, useEffect, useCallback } from 'react'
import { CpuIcon, CheckCircleIcon, WarningCircleIcon, CircleNotchIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { runQuboScheduling } from '../../services/aiApi'

const DEMO_SESSIONS = [
  { id: 'demo-s1', title: 'Computer Vision & Medical Imaging', speaker: 'Dr. N. Cherif', theme: 'vision' },
  { id: 'demo-s2', title: 'LLMs & Multilingual Processing', speaker: 'Dr. K. Belaid', theme: 'nlp' },
  { id: 'demo-s3', title: 'Agents & Systems Security', speaker: 'Dr. A. Kaci', theme: 'security' },
  { id: 'demo-s4', title: 'QUBO & QAOA Optimization', speaker: 'Dr. N. Cherif', theme: 'quantum' },
]

const DEMO_ROOMS = [
  { id: 'demo-r1', name: 'Ibn Khaldoun Amphitheater' },
  { id: 'demo-r2', name: 'Research Room B2' },
]

const DEMO_TIMESLOTS = ['09:00 – 10:30', '14:00 – 15:30']

function buildTimeslots(sessionCount, roomCount) {
  const base = ['09:00 – 10:30', '11:00 – 12:30', '14:00 – 15:30', '16:00 – 17:30']
  const minSlots = Math.max(2, Math.ceil(sessionCount / Math.max(1, roomCount)))
  return base.slice(0, Math.min(base.length, minSlots))
}

function slotToIsoPair(eventStartDate, slotLabel) {
  const day = (eventStartDate || new Date().toISOString()).slice(0, 10)
  const [startStr, endStr] = slotLabel.split('–').map((s) => s.trim())
  return {
    start_time: `${day}T${startStr || '09:00'}:00`,
    end_time: `${day}T${endStr || '10:30'}:00`,
  }
}

export default function AIQuboPanel({ eventId, event, onApplied }) {
  const [sessions, setSessions] = useState([])
  const [acceptedSubs, setAcceptedSubs] = useState([])
  const [rooms, setRooms] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [solver, setSolver] = useState('exact')
  const [running, setRunning] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const loadData = useCallback(async () => {
    setLoadingData(true)
    setError(null)
    const [sessRes, roomRes, subRes] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, title, session_type, start_time, end_time, room_id')
        .eq('event_id', eventId)
        .order('start_time', { ascending: true, nullsFirst: false }),
      supabase
        .from('rooms')
        .select('id, name, capacity')
        .eq('event_id', eventId)
        .order('name'),
      supabase
        .from('submissions')
        .select('id, title, status, profiles(full_name)')
        .eq('event_id', eventId)
        .eq('status', 'accepted'),
    ])

    if (sessRes.error || roomRes.error) {
      setError((sessRes.error || roomRes.error).message)
      setLoadingData(false)
      return
    }

    setSessions(sessRes.data || [])
    setRooms(roomRes.data || [])
    setAcceptedSubs(subRes.data || [])
    setLoadingData(false)
  }, [eventId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const realCandidates = sessions.length >= 2
    ? sessions.map((s) => ({
        id: String(s.id),
        title: s.title || 'Session',
        speaker: '',
        theme: s.session_type || '',
      }))
    : acceptedSubs.map((sub) => ({
        id: String(sub.id),
        title: sub.title || 'Accepted paper',
        speaker: sub.profiles?.full_name || '',
        theme: 'accepted',
      }))

  const hasEnoughRealData = realCandidates.length >= 2 && rooms.length >= 1
  const canApplyRealSessions = Boolean(result && !result.is_demo_fallback && sessions.length >= 2)

  const executeQubo = async ({ useDemo = false } = {}) => {
    setRunning(true)
    setApplied(false)
    setError(null)
    try {
      const payload = useDemo
        ? {
            sessions: DEMO_SESSIONS,
            rooms: DEMO_ROOMS,
            timeslots: DEMO_TIMESLOTS,
            solver,
            isDemoFallback: true,
          }
        : {
            sessions: realCandidates,
            rooms: rooms.map((r) => ({ id: String(r.id), name: r.name })),
            timeslots: buildTimeslots(realCandidates.length, rooms.length),
            solver,
            isDemoFallback: false,
          }

      const data = await runQuboScheduling(payload)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  const handleApplySchedule = async () => {
    if (!canApplyRealSessions || !result?.assignments?.length) return
    setApplying(true)
    setError(null)

    try {
      const updates = result.assignments
        .filter((a) => a.room_id)
        .map((a) => {
          const { start_time, end_time } = slotToIsoPair(event?.start_date, a.timeslot)
          return supabase
            .from('sessions')
            .update({ room_id: a.room_id, start_time, end_time })
            .eq('id', a.session_id)
        })

      const responses = await Promise.all(updates)
      const firstErr = responses.find((r) => r.error)?.error
      if (firstErr) throw firstErr

      setApplied(true)
      onApplied?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div dir="ltr" className="text-left rounded-xl border border-line bg-surface shadow-card p-6 sm:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-surface-2 border border-black/[0.06] dark:border-white/[0.06] text-fg flex items-center justify-center shrink-0">
            <CpuIcon size={22} weight="duotone" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-fg">
                QUBO Scheduling
              </h2>
              <span className="text-[11px] font-mono text-muted bg-surface-2 px-2 py-0.5 rounded-md border border-black/[0.06] dark:border-white/[0.06]">
                Qiskit • Exact / QAOA
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Quadratic unconstrained binary optimization of time slots and rooms without speaker or topic overlaps.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => executeQubo({ useDemo: false })}
          disabled={loadingData || !hasEnoughRealData || running}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg min-h-10 text-xs sm:text-sm font-semibold bg-accent hover:opacity-90 text-on-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
        >
          {running && <CircleNotchIcon size={16} className="animate-spin" aria-hidden="true" />}
          <span>{running ? 'Optimizing…' : 'Optimize Schedule (QUBO)'}</span>
        </button>
      </div>

      {/* Solver selector + counters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="inline-flex items-center p-1 rounded-xl bg-surface-2 border border-black/[0.06] dark:border-white/[0.06] w-fit">
          <button
            type="button"
            onClick={() => setSolver('exact')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              solver === 'exact'
                ? 'bg-surface text-fg shadow-xs'
                : 'text-muted hover:text-fg'
            }`}
          >
            Exact Solver (Fast)
          </button>
          <button
            type="button"
            onClick={() => setSolver('qaoa')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              solver === 'qaoa'
                ? 'bg-surface text-fg shadow-xs'
                : 'text-muted hover:text-fg'
            }`}
          >
            QAOA (Qiskit Quantum)
          </button>
        </div>

        {!loadingData && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="px-2.5 py-1 rounded-full bg-surface-2 border border-black/[0.06] dark:border-white/[0.06] num">
              {realCandidates.length} {realCandidates.length === 1 ? 'session / paper' : 'sessions / papers'}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-surface-2 border border-black/[0.06] dark:border-white/[0.06] num">
              {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-bad/30 bg-bad/10 text-bad text-xs sm:text-sm">
          <WarningCircleIcon size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {loadingData ? (
        <div className="space-y-2.5">
          <div className="skeleton h-16 w-full rounded-xl" />
          <div className="skeleton h-10 w-full rounded-xl" />
        </div>
      ) : !hasEnoughRealData && !result ? (
        <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60 p-6 text-center space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-fg">
              Not enough sessions or rooms configured for this event
            </p>
            <p className="text-xs text-muted">
              Add at least 2 sessions (or accepted papers) and 1 room in &quot;Rooms &amp; Halls&quot;, or test the solver immediately with a demo dataset.
            </p>
          </div>
          <button
            type="button"
            onClick={() => executeQubo({ useDemo: true })}
            disabled={running}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border border-black/[0.08] dark:border-white/[0.1] bg-surface hover:bg-surface-2 text-fg transition-colors cursor-pointer disabled:opacity-50"
          >
            {running && <CircleNotchIcon size={14} className="animate-spin" aria-hidden="true" />}
            <span>Test on a demo dataset (4 sessions, 2 rooms)</span>
          </button>
        </div>
      ) : result ? (
        <div className="space-y-5">
          {result.is_demo_fallback && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-surface-2/70 border border-black/[0.06] dark:border-white/[0.06] text-xs text-muted">
              <span>Result computed on the demo dataset (4 sessions, 2 rooms).</span>
              <span className="font-mono text-fg">{result.metrics?.solver_used}</span>
            </div>
          )}

          {/* 3 inline metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60 p-4">
              <span className="text-xs text-muted block">Residual Conflicts</span>
              <span className={`num text-xl font-bold mt-1 block ${result.metrics?.conflicts_count === 0 ? 'text-ok' : 'text-warn'}`}>
                {result.metrics?.conflicts_count ?? 0}
              </span>
            </div>
            <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60 p-4">
              <span className="text-xs text-muted block">QUBO Energy</span>
              <span className="num text-xl font-bold text-fg mt-1 block">
                {result.metrics?.energy_value ?? 0}
              </span>
            </div>
            <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60 p-4">
              <span className="text-xs text-muted block">Time / Qubits</span>
              <span className="num text-xl font-bold text-fg mt-1 block">
                {result.metrics?.execution_time_ms ?? 0} ms · {result.metrics?.num_qubits ?? 0} q
              </span>
            </div>
          </div>

          {/* Generated schedule table */}
          <div className="overflow-x-auto rounded-xl border border-black/[0.06] dark:border-white/[0.06]">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.06] bg-surface-2/60 text-muted text-xs">
                  <th className="py-3 px-4 font-semibold">Time Slot</th>
                  <th className="py-3 px-4 font-semibold">Room</th>
                  <th className="py-3 px-4 font-semibold">Session / Paper</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {(result.assignments || []).map((a) => (
                  <tr key={`${a.session_id}-${a.timeslot}`} className="hover:bg-surface-2/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-fg whitespace-nowrap">
                      {a.timeslot}
                    </td>
                    <td className="py-3 px-4 text-fg whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full bg-surface-2 border border-black/[0.06] dark:border-white/[0.06] text-xs font-medium">
                        {a.room_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-fg">
                      <span className="block">{a.session_title}</span>
                      {a.speaker && (
                        <span className="text-xs text-muted font-normal">{a.speaker}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card footer action */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-xs text-muted font-mono">
              Solver: {result.metrics?.solver_used}
            </span>

            {canApplyRealSessions ? (
              applied ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ok px-3 py-1.5 rounded-lg bg-ok/10">
                  <CheckCircleIcon size={15} weight="bold" aria-hidden="true" />
                  <span>Schedule applied to program</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleApplySchedule}
                  disabled={applying}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-black/[0.08] dark:border-white/[0.1] bg-surface-2 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-fg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {applying ? 'Applying…' : 'Apply to Program'}
                </button>
              )
            ) : (
              <button
                type="button"
                disabled
                title="Add real sessions and rooms to the event to save this schedule to the database"
                className="px-4 py-2 rounded-xl text-xs font-medium border border-black/[0.06] dark:border-white/[0.06] bg-surface-2/60 text-muted opacity-60 cursor-not-allowed"
              >
                Apply to Program
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-bg/60 p-6 text-center space-y-1">
          <p className="text-sm font-medium text-fg">
            {realCandidates.length} {realCandidates.length === 1 ? 'session' : 'sessions'} ready to be scheduled across {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
          </p>
          <p className="text-xs text-muted">
            Select the solver and click &quot;Optimize Schedule (QUBO)&quot;.
          </p>
        </div>
      )}
    </div>
  )
}
