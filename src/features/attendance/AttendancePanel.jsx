import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../../lib/supabaseClient'

const RESULT_CLASS = {
  ok: 'alert-success',
  warn: 'alert-info',
  error: 'alert-error',
}

export default function AttendancePanel({ eventId, participants }) {
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState('')
  const [records, setRecords] = useState([])
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)

  // le scanner garde sa fonction de rappel : on lit les valeurs courantes par des refs
  const sessionIdRef = useRef('')
  const busyRef = useRef(false)
  const lastScanRef = useRef({ token: '', at: 0 })
  const scannerRef = useRef(null)
  sessionIdRef.current = sessionId

  const members = participants.filter(
    (p) => p.role_in_event === 'participant' && p.registration_status === 'validated',
  )

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
    if (loadError) setError(loadError.message)
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
    const { data, error: rpcError } = await supabase.rpc('check_in_by_token', {
      p_session_id: sessionIdRef.current,
      p_token: token,
    })
    busyRef.current = false

    if (rpcError) setResult({ type: 'error', text: rpcError.message })
    else {
      showResult(data)
      loadRecords()
    }
  }

  const checkInMember = async (userId) => {
    if (!sessionId) {
      setResult({ type: 'error', text: "Choisis d'abord une session." })
      return
    }
    setBusy(true)
    const { data, error: rpcError } = await supabase.rpc('check_in_member', {
      p_session_id: sessionId,
      p_user_id: userId,
      p_method: 'manual',
    })
    setBusy(false)

    if (rpcError) setResult({ type: 'error', text: rpcError.message })
    else {
      showResult(data)
      loadRecords()
    }
  }

  const removeRecord = async (recordId) => {
    setBusy(true)
    const { data, error: deleteError } = await supabase
      .from('attendance')
      .delete()
      .eq('id', recordId)
      .select('id')
    setBusy(false)

    if (deleteError) setResult({ type: 'error', text: deleteError.message })
    else if (!data || data.length === 0) setResult({ type: 'error', text: 'Retrait refusé.' })
    else {
      setResult({ type: 'warn', text: 'Présence retirée.' })
      loadRecords()
    }
  }

  // caméra : démarre quand "scanning" passe à vrai, s'arrête quand il repasse à faux
  useEffect(() => {
    if (!scanning) return undefined

    let cancelled = false
    let scanner = null

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode('qr-reader')
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 220 },
          (text) => checkInToken(text),
          () => {},
        )
        if (cancelled) {
          await scanner.stop()
          scanner.clear()
        }
      } catch (err) {
        if (!cancelled) {
          setError(`Caméra inaccessible : ${err?.message || err}. Utilise la liste ci-dessous.`)
          setScanning(false)
        }
      }
    }

    const timer = setTimeout(startScanner, 150)

    return () => {
      clearTimeout(timer)
      cancelled = true
      if (scanner) {
        try {
          scanner.stop().then(() => scanner.clear()).catch(() => {})
        } catch (stopError) {
          // le scanner n'avait pas démarré : rien à arrêter
        }
      }
    }
  }, [scanning])

  const sessionRecords = records.filter((r) => r.session_id === sessionId)
  const recordByUser = new Map(sessionRecords.map((r) => [r.profile_id, r]))

  const countByUser = new Map()
  records.forEach((r) => {
    if (r.session_id) countByUser.set(r.profile_id, (countByUser.get(r.profile_id) || 0) + 1)
  })

  const filtered = members.filter((p) =>
    (p.profiles?.full_name || '').toLowerCase().includes(search.trim().toLowerCase()),
  )

  const summary = [...members].sort(
    (a, b) => (countByUser.get(b.user_id) || 0) - (countByUser.get(a.user_id) || 0),
  )

  return (
    <section>
      <div className="mb-5">
        <p className="section-label">Présences</p>
        <h2 className="section-heading text-xl mt-1">Pointage des sessions</h2>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}

      {sessions.length === 0 ? (
        <p className="text-sm text-taupe">Crée d'abord des sessions pour pouvoir pointer les présences.</p>
      ) : (
        <div className="card p-5 space-y-4">
          <div>
            <label htmlFor="attendance-session" className="form-label">Session</label>
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
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>

          {sessionId && (
            <p className="font-mono text-sm text-ink">
              {sessionRecords.length} présent{sessionRecords.length > 1 ? 's' : ''} sur {members.length} inscrit
              {members.length > 1 ? 's' : ''} validé{members.length > 1 ? 's' : ''}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={scanning ? 'btn-outline btn-sm' : 'btn-primary btn-sm'}
              disabled={!sessionId}
              onClick={() => {
                setError(null)
                setScanning((v) => !v)
              }}
            >
              {scanning ? 'Arrêter le scan' : 'Scanner les badges'}
            </button>
          </div>

          {scanning && <div id="qr-reader" style={{ width: '100%', maxWidth: 360 }} />}

          {result && <div className={RESULT_CLASS[result.type]}>{result.text}</div>}

          {sessionId && (
            <div>
              <p className="section-label mb-2">Pointage manuel</p>
              <input
                className="input-field mb-3"
                placeholder="Rechercher un inscrit…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {filtered.length === 0 ? (
                <p className="text-sm text-taupe">Aucun inscrit validé.</p>
              ) : (
                <ul className="space-y-2">
                  {filtered.map((p) => {
                    const rec = recordByUser.get(p.user_id)
                    return (
                      <li key={p.id} className="list-item">
                        <span className="text-sm font-medium text-ink truncate">{p.profiles?.full_name}</span>
                        {rec ? (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="badge-accepted">
                              Présent{rec.method === 'manual' ? ' (manuel)' : ''}
                            </span>
                            <button
                              type="button"
                              className="btn-outline btn-sm"
                              disabled={busy}
                              onClick={() => removeRecord(rec.id)}
                            >
                              Retirer
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn-ghost-gold btn-sm"
                            disabled={busy}
                            onClick={() => checkInMember(p.user_id)}
                          >
                            Marquer présent
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
        <div className="card p-5 mt-6">
          <p className="section-label mb-3">Présence par participant</p>
          <ul className="space-y-2">
            {summary.map((p) => (
              <li key={p.id} className="list-item">
                <span className="text-sm text-ink truncate">{p.profiles?.full_name}</span>
                <span className="font-mono text-xs text-taupe">
                  {countByUser.get(p.user_id) || 0} / {sessions.length} session{sessions.length > 1 ? 's' : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}