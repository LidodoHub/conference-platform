import { useState, useEffect, useRef, useCallback } from 'react'
import { QrCodeIcon, StopIcon, MagnifyingGlassIcon, CheckIcon, ArrowCounterClockwiseIcon, PresentationChartIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { frError, writeError } from '../../lib/errors'
import Avatar from '../../components/ui/Avatar'
import SectionTitle from '../../components/ui/SectionTitle'
import EmptyState from '../../components/ui/EmptyState'
import { BarList } from '../../components/charts/Charts'

const RESULT_CLASS = { ok: 'alert-success', warn: 'alert-info', error: 'alert-error' }

const sessionLabel = (s) =>
  s.start_time
    ? `${s.title} (${new Date(s.start_time).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})`
    : s.title

export default function AttendancePanel({ eventId, participants }) {
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState('')
  const [records, setRecords] = useState([])
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)

  // le scanner garde sa fonction de rappel : il lit les valeurs courantes via des refs
  const sessionIdRef = useRef('')
  const busyRef = useRef(false)
  const lastScanRef = useRef({ token: '', at: 0 })
  const onScanRef = useRef(() => {})

  const members = participants.filter((p) => p.role_in_event === 'participant' && p.registration_status === 'validated')

  useEffect(() => {
    supabase
      .from('sessions')
      .select('id, title, start_time')
      .eq('event_id', eventId)
      .order('start_time', { ascending: true, nullsFirst: false })
      .then(({ data }) => setSessions(data || []))
  }, [eventId])

  const loadRecords = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('attendance')
      .select('id, session_id, profile_id, checked_in_at, method')
      .eq('event_id', eventId)
    if (loadError) setError(frError(loadError))
    else setRecords(data)
  }, [eventId])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const showResult = (data) => {
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return
    const n = row.sessions_attended
    setResult({
      type: row.was_already ? 'warn' : 'ok',
      text: row.was_already
        ? `${row.person_name} est déjà enregistré(e) dans cette session.`
        : `Présence enregistrée : ${row.person_name} (${n} session${n > 1 ? 's' : ''} suivie${n > 1 ? 's' : ''}).`,
    })
  }

  const checkInToken = async (token) => {
    if (!sessionIdRef.current) {
      setResult({ type: 'error', text: "Choisis d'abord une session." })
      return
    }
    if (busyRef.current) return
    const now = Date.now()
    if (lastScanRef.current.token === token && now - lastScanRef.current.at < 4000) return
    lastScanRef.current = { token, at: now }

    busyRef.current = true
    const { data, error: rpcError } = await supabase.rpc('check_in_by_token', { p_session_id: sessionIdRef.current, p_token: token })
    busyRef.current = false
    if (rpcError) setResult({ type: 'error', text: frError(rpcError) })
    else {
      showResult(data)
      loadRecords()
    }
  }

  useEffect(() => {
    sessionIdRef.current = sessionId
    onScanRef.current = checkInToken
  })

  const checkInMember = async (userId) => {
    setBusy(true)
    const { data, error: rpcError } = await supabase.rpc('check_in_member', { p_session_id: sessionId, p_user_id: userId, p_method: 'manual' })
    setBusy(false)
    if (rpcError) setResult({ type: 'error', text: frError(rpcError) })
    else {
      showResult(data)
      loadRecords()
    }
  }

  const removeRecord = async (recordId) => {
    setBusy(true)
    const res = await supabase.from('attendance').delete().eq('id', recordId).select('id')
    setBusy(false)
    const msg = writeError(res, 'Retrait refusé.')
    if (msg) setResult({ type: 'error', text: msg })
    else {
      setResult({ type: 'warn', text: 'Présence retirée.' })
      loadRecords()
    }
  }

  // caméra : la librairie n'est chargée qu'au premier scan (allège la page)
  useEffect(() => {
    if (!scanning) return undefined
    let cancelled = false
    let scanner = null

    const timer = setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (cancelled) return
        scanner = new Html5Qrcode('qr-reader')
        await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 }, (text) => onScanRef.current(text), () => {})
        if (cancelled) {
          await scanner.stop()
          scanner.clear()
        }
      } catch (err) {
        if (!cancelled) {
          setError(`Caméra inaccessible : ${err?.message || err}. Utilise le pointage manuel.`)
          setScanning(false)
        }
      }
    }, 150)

    return () => {
      clearTimeout(timer)
      cancelled = true
      if (scanner) {
        // en mode strict React, stop() peut lever une exception de façon synchrone
        try {
          scanner
            .stop()
            .then(() => scanner.clear())
            .catch(() => {})
        } catch {
          // le scanner n'avait pas démarré
        }
      }
    }
  }, [scanning])

  const sessionRecords = records.filter((r) => r.session_id === sessionId)
  const recordByUser = new Map(sessionRecords.map((r) => [r.profile_id, r]))
  const presentMembers = members.filter((m) => recordByUser.has(m.user_id)).length

  const countByUser = new Map()
  records.forEach((r) => {
    if (r.session_id) countByUser.set(r.profile_id, (countByUser.get(r.profile_id) || 0) + 1)
  })

  const q = search.trim().toLowerCase()
  const filtered = members
    .filter((p) => (p.profiles?.full_name || '').toLowerCase().includes(q))
    .sort((a, b) => Number(recordByUser.has(a.user_id)) - Number(recordByUser.has(b.user_id)) || (a.profiles?.full_name || '').localeCompare(b.profiles?.full_name || ''))

  return (
    <section className="space-y-8">
      <SectionTitle title="Présences" description="Scanne les badges QR à l'entrée de chaque session, ou pointe à la main." />

      {error && (
        <div role="alert" className="alert-error">
          {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <EmptyState icon={PresentationChartIcon} title="Aucune session" body="Crée d'abord des sessions dans l'onglet Programme." />
      ) : (
        <div className="card-panel space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-4 md:items-end">
            <div>
              <label htmlFor="attendance-session" className="form-label">
                Session
              </label>
              <select
                id="attendance-session"
                className="select-field"
                value={sessionId}
                onChange={(e) => {
                  setSessionId(e.target.value)
                  setResult(null)
                }}
              >
                <option value="">Choisir une session…</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {sessionLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className={scanning ? 'btn-outline' : 'btn-primary'}
              disabled={!sessionId}
              onClick={() => {
                setError(null)
                setScanning((v) => !v)
              }}
            >
              {scanning ? <StopIcon size={17} aria-hidden="true" /> : <QrCodeIcon size={17} aria-hidden="true" />}
              {scanning ? 'Arrêter le scan' : 'Scanner les badges'}
            </button>
          </div>

          {sessionId && (
            <div className="flex items-end gap-4">
              <p className="num text-5xl font-semibold tracking-tight text-fg leading-none">
                {presentMembers}
                <span className="text-2xl text-faint font-normal"> / {members.length}</span>
              </p>
              <p className="text-sm text-muted pb-1">inscrits présents dans cette session</p>
            </div>
          )}

          {scanning && <div id="qr-reader" className="w-full max-w-sm overflow-hidden rounded-xl border border-line" />}

          {result && (
            <div role="status" className={RESULT_CLASS[result.type]}>
              {result.text}
            </div>
          )}

          {sessionId && (
            <div className="pt-2">
              <h3 className="font-medium text-fg mb-3">Pointage manuel</h3>
              <label className="relative block mb-3">
                <span className="sr-only">Rechercher un inscrit</span>
                <MagnifyingGlassIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" aria-hidden="true" />
                <input className="input-field pl-10" type="search" placeholder="Rechercher un inscrit…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </label>
              {filtered.length === 0 ? (
                <p className="text-sm text-muted">Aucun inscrit validé.</p>
              ) : (
                <ul className="space-y-2">
                  {filtered.map((p) => {
                    const rec = recordByUser.get(p.user_id)
                    return (
                      <li key={p.id} className="row" style={{ '--stripe': rec ? 'var(--color-ok)' : 'transparent' }}>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar name={p.profiles?.full_name} size={34} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-fg truncate">{p.profiles?.full_name}</p>
                            {rec && (
                              <p className="text-xs text-ok">
                                Présent{rec.method === 'manual' ? ', pointé à la main' : ', badge scanné'}
                              </p>
                            )}
                          </div>
                        </div>
                        {rec ? (
                          <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => removeRecord(rec.id)}>
                            <ArrowCounterClockwiseIcon size={15} aria-hidden="true" />
                            Annuler
                          </button>
                        ) : (
                          <button type="button" className="btn-outline btn-sm" disabled={busy} onClick={() => checkInMember(p.user_id)}>
                            <CheckIcon size={15} weight="bold" aria-hidden="true" />
                            Présent
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {records.length > 0 && (
        <section className="card-panel">
          <h3 className="font-semibold text-fg mb-5">Assiduité par participant</h3>
          <BarList
            max={Math.max(1, sessions.length)}
            items={[...members]
              .sort((a, b) => (countByUser.get(b.user_id) || 0) - (countByUser.get(a.user_id) || 0))
              .map((p) => ({
                key: p.id,
                label: p.profiles?.full_name,
                value: countByUser.get(p.user_id) || 0,
                detail: `/ ${sessions.length} session${sessions.length > 1 ? 's' : ''}`,
              }))}
          />
        </section>
      )}
    </section>
  )
}
