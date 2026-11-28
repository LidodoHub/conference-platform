import { useState } from 'react'
import { WarningIcon } from '@phosphor-icons/react'
import { SESSION_TYPE_LABELS } from '../../lib/constants'
import { useLanguage } from '../../context/LanguageContext'

// ISO -> valeur d'un <input type="datetime-local"> en heure locale
const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const overlaps = (a, b) => a.start < b.end && b.start < a.end

// Création et modification d'une session. Vérifie les conflits de salle avant l'envoi
// (la base les refuse de toute façon : trigger check_session_room).
export default function SessionForm({ initial, rooms, sessions, showMeeting, onSubmit, onCancel, submitLabel }) {
  const { t } = useLanguage()
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    session_type: initial?.session_type || 'talk',
    start_time: toLocalInput(initial?.start_time),
    end_time: toLocalInput(initial?.end_time),
    max_capacity: initial?.max_capacity ?? '',
    room_id: initial?.room_id || '',
    meeting_url: initial?.meeting_url || '',
  })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }))

  const start = form.start_time ? new Date(form.start_time) : null
  const end = form.end_time ? new Date(form.end_time) : null
  const room = rooms.find((r) => r.id === form.room_id)

  const clash =
    room && start && end
      ? sessions.find(
          (s) =>
            s.id !== initial?.id &&
            s.room_id === room.id &&
            s.start_time &&
            s.end_time &&
            overlaps({ start, end }, { start: new Date(s.start_time), end: new Date(s.end_time) }),
        )
      : null
  const overCapacity = room?.capacity && form.max_capacity && Number(form.max_capacity) > room.capacity

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (start && end && end <= start) {
      setError(t('sessionForm.endBeforeStart'))
      return
    }
    if (clash) {
      setError(t('sessionForm.roomClashError', { title: clash.title, room: room.name }))
      return
    }
    const url = form.meeting_url.trim()
    if (url && !/^https?:\/\//i.test(url)) {
      setError(t('sessionForm.meetingUrlError'))
      return
    }
    setBusy(true)
    const err = await onSubmit({
      title: form.title.trim(),
      description: form.description.trim() || null,
      session_type: form.session_type,
      start_time: start ? start.toISOString() : null,
      end_time: end ? end.toISOString() : null,
      max_capacity: form.max_capacity ? Number(form.max_capacity) : null,
      room_id: form.room_id || null,
      meeting_url: url || null,
    })
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <form onSubmit={submit} className="card-panel space-y-5 rise">
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_200px] gap-5">
        <div>
          <label htmlFor="session-title" className="form-label">
            {t('sessionForm.titleLabel')}
          </label>
          <input id="session-title" className="input-field" value={form.title} onChange={set('title')} required />
        </div>
        <div>
          <label htmlFor="session-type" className="form-label">
            {t('sessionForm.typeLabel')}
          </label>
          <select id="session-type" className="select-field" value={form.session_type} onChange={set('session_type')}>
            {Object.keys(SESSION_TYPE_LABELS).map((value) => (
              <option key={value} value={value}>
                {t(`sessionForm.types.${value}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="session-start" className="form-label">
            {t('sessionForm.startLabel')}
          </label>
          <input id="session-start" type="datetime-local" className="input-field num" value={form.start_time} onChange={set('start_time')} />
        </div>
        <div>
          <label htmlFor="session-end" className="form-label">
            {t('sessionForm.endLabel')}
          </label>
          <input
            id="session-end"
            type="datetime-local"
            className="input-field num"
            min={form.start_time || undefined}
            value={form.end_time}
            onChange={set('end_time')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
        <div>
          <label htmlFor="session-room" className="form-label">
            {t('sessionForm.roomLabel')}
          </label>
          <select id="session-room" className="select-field" value={form.room_id} onChange={set('room_id')}>
            <option value="">{rooms.length ? t('sessionForm.noRoom') : t('sessionForm.noRoomCreated')}</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.capacity ? ` ${t('sessionForm.seatsCount', { count: r.capacity })}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="session-capacity" className="form-label">
            {t('sessionForm.capacityLabel')}
          </label>
          <input
            id="session-capacity"
            type="number"
            min="1"
            inputMode="numeric"
            className="input-field num"
            value={form.max_capacity}
            onChange={set('max_capacity')}
          />
        </div>
      </div>

      {(clash || overCapacity) && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warn/35 bg-warn/8 px-4 py-3 text-sm text-fg">
          <WarningIcon size={18} className="text-warn shrink-0 mt-px" aria-hidden="true" />
          <span>
            {clash && t('sessionForm.clashWarning', { title: clash.title, room: room.name })}
            {clash && overCapacity && <br />}
            {overCapacity && t('sessionForm.overCapacityWarning', { capacity: room.capacity })}
          </span>
        </div>
      )}

      {showMeeting && (
        <div>
          <label htmlFor="session-meeting" className="form-label">
            {t('sessionForm.meetingLabel')}
          </label>
          <input
            id="session-meeting"
            type="url"
            inputMode="url"
            className="input-field"
            placeholder={t('sessionForm.meetingPlaceholder')}
            value={form.meeting_url}
            onChange={set('meeting_url')}
          />
          <p className="form-hint">{t('sessionForm.meetingHint')}</p>
        </div>
      )}

      <div>
        <label htmlFor="session-description" className="form-label">
          {t('sessionForm.descriptionLabel')}
        </label>
        <textarea id="session-description" className="textarea-field" rows={3} value={form.description} onChange={set('description')} />
      </div>

      {error && (
        <div role="alert" className="alert-error">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? t('common.saving') : submitLabel}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}
