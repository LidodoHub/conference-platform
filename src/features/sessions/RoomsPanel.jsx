import { useState, useEffect, useCallback } from 'react'
import { PlusIcon, PencilSimpleIcon, TrashIcon, DoorOpenIcon, UsersThreeIcon, MapPinIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { frError, writeError } from '../../lib/errors'
import { useConfirm } from '../../context/ConfirmContext'
import { useLanguage } from '../../context/LanguageContext'
import SectionTitle from '../../components/ui/SectionTitle'
import EmptyState from '../../components/ui/EmptyState'

const EMPTY = { name: '', capacity: '', location: '' }

// Salles de l'événement : CRUD par l'organisateur. Les sessions y sont ensuite placées (Programme).
export default function RoomsPanel({ eventId }) {
  const confirm = useConfirm()
  const { t } = useLanguage()
  const [rooms, setRooms] = useState([])
  const [usage, setUsage] = useState({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | 'new' | id
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    const [roomsRes, sessRes] = await Promise.all([
      supabase.from('rooms').select('id, name, capacity, location').eq('event_id', eventId).order('name'),
      supabase.from('sessions').select('room_id').eq('event_id', eventId),
    ])
    if (roomsRes.error) setError(frError(roomsRes.error))
    else setRooms(roomsRes.data)
    const counts = {}
    for (const s of sessRes.data || []) if (s.room_id) counts[s.room_id] = (counts[s.room_id] || 0) + 1
    setUsage(counts)
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    load()
  }, [load])

  const startEdit = (room) => {
    setError(null)
    setEditing(room ? room.id : 'new')
    setForm(room ? { name: room.name, capacity: room.capacity ?? '', location: room.location || '' } : EMPTY)
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const values = {
      name: form.name.trim(),
      capacity: form.capacity ? Number(form.capacity) : null,
      location: form.location.trim() || null,
    }
    const res =
      editing === 'new'
        ? await supabase.from('rooms').insert({ ...values, event_id: eventId }).select('id')
        : await supabase.from('rooms').update(values).eq('id', editing).select('id')
    setBusy(false)
    const msg = writeError(res, t('errors.saveRefused'))
    if (msg) setError(msg)
    else {
      setEditing(null)
      load()
    }
  }

  const remove = async (room) => {
    const n = usage[room.id] || 0
    const ok = await confirm({
      title: t('rooms.deleteTitle', { name: room.name }),
      description: n ? t('rooms.deleteDesc', { count: n }) : '',
      confirmLabel: t('common.delete'),
      variant: 'danger',
    })
    if (!ok) return
    setError(null)
    const res = await supabase.from('rooms').delete().eq('id', room.id).select('id')
    const msg = writeError(res, t('errors.deleteRefused'))
    if (msg) setError(msg)
    else load()
  }

  const formEl = (
    <form onSubmit={save} className="card-panel space-y-5 rise">
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
        <div>
          <label htmlFor="room-name" className="form-label">
            {t('rooms.nameLabel')}
          </label>
          <input id="room-name" className="input-field" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </div>
        <div>
          <label htmlFor="room-cap" className="form-label">
            {t('rooms.capacityLabel')}
          </label>
          <input
            id="room-cap"
            type="number"
            min="1"
            inputMode="numeric"
            className="input-field num"
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
          />
        </div>
      </div>
      <div>
        <label htmlFor="room-loc" className="form-label">
          {t('rooms.locationLabel')}
        </label>
        <input id="room-loc" className="input-field" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
        <p className="form-hint">
          {t('rooms.locationHint')}
        </p>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? t('common.saving') : editing === 'new' ? t('rooms.addRoomSubmit') : t('common.save')}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )

  return (
    <section>
      <SectionTitle
        title={t('event.rooms')}
        count={rooms.length}
        description={t('rooms.description')}
        actions={
          editing === null && (
            <button type="button" className="btn-accent" onClick={() => startEdit(null)}>
              <PlusIcon size={16} weight="bold" aria-hidden="true" />
              {t('rooms.addRoomBtn')}
            </button>
          )
        }
      />

      {error && (
        <div role="alert" className="alert-error mb-4">
          {error}
        </div>
      )}

      {editing === 'new' && <div className="mb-6">{formEl}</div>}

      {loading ? (
        <div className="skeleton h-32" />
      ) : rooms.length === 0 && editing !== 'new' ? (
        <EmptyState
          icon={DoorOpenIcon}
          title={t('rooms.emptyTitle')}
          body={t('rooms.emptyBody')}
        />
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rooms.map((room) =>
            editing === room.id ? (
              <li key={room.id} className="md:col-span-2">
                {formEl}
              </li>
            ) : (
              <li key={room.id} className="entity" style={{ '--stripe': 'var(--color-accent)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-fg">{room.name}</h4>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
                      {room.capacity && (
                        <span className="inline-flex items-center gap-1.5">
                          <UsersThreeIcon size={14} aria-hidden="true" />
                          {room.capacity} {t('rooms.seats')}
                        </span>
                      )}
                      {room.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPinIcon size={14} aria-hidden="true" />
                          {room.location}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-faint">
                      {usage[room.id]
                        ? t(usage[room.id] > 1 ? 'rooms.scheduledPlural' : 'rooms.scheduledSingle', { count: usage[room.id] })
                        : t('rooms.noSessions')}
                    </p>
                  </div>
                  <span className="flex gap-1 shrink-0">
                    <button type="button" className="icon-btn w-9 h-9" onClick={() => startEdit(room)} aria-label={`${t('common.edit')} ${room.name}`}>
                      <PencilSimpleIcon size={16} />
                    </button>
                    <button type="button" className="icon-btn w-9 h-9 hover:text-bad" onClick={() => remove(room)} aria-label={`${t('common.delete')} ${room.name}`}>
                      <TrashIcon size={16} />
                    </button>
                  </span>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  )
}
