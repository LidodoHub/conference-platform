import { useEffect, useMemo, useState } from 'react'
import { loadRecords, insertRecord, updateRecord } from '../../lib/persist'
import EmptyState from '../../components/ui/EmptyState'

function overlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd
}

export default function LogisticsPanel({ eventId, canEdit }) {
  const [rooms, setRooms] = useState([])
  const [reservations, setReservations] = useState([])
  const [resources, setResources] = useState([])
  const [stay, setStay] = useState([])
  const [form, setForm] = useState({ kind: 'room' })
  const [conflict, setConflict] = useState(null)

  const refresh = async () => {
    const [r, res, eq, st] = await Promise.all([
      loadRecords('rooms', eventId),
      loadRecords('reservations', eventId),
      loadRecords('resources', eventId),
      loadRecords('logistics', eventId),
    ])
    setRooms(r.rows)
    setReservations(res.rows)
    setResources(eq.rows)
    setStay(st.rows)
  }

  useEffect(() => {
    refresh()
  }, [eventId])

  const conflicts = useMemo(() => {
    const hits = []
    for (let i = 0; i < reservations.length; i += 1) {
      for (let j = i + 1; j < reservations.length; j += 1) {
        const a = reservations[i]
        const b = reservations[j]
        if (a.room === b.room && overlap(a.start_slot || '', a.end_slot || '', b.start_slot || '', b.end_slot || '')) {
          hits.push([a, b])
        }
      }
    }
    return hits
  }, [reservations])

  const add = async (e) => {
    e.preventDefault()
    setConflict(null)
    if (form.kind === 'room') {
      await insertRecord('rooms', eventId, {
        name: form.name,
        capacity: form.capacity,
        status: 'open',
      })
    } else if (form.kind === 'reservation') {
      const clash = reservations.some(
        (row) =>
          row.room === form.room &&
          overlap(form.start_slot || '', form.end_slot || '', row.start_slot || '', row.end_slot || ''),
      )
      if (clash) {
        setConflict('Créneau en conflit avec une réservation existante.')
        return
      }
      await insertRecord('reservations', eventId, {
        room: form.room,
        title: form.name,
        start_slot: form.start_slot,
        end_slot: form.end_slot,
      })
    } else if (form.kind === 'resource') {
      await insertRecord('resources', eventId, { name: form.name, quantity: form.capacity })
    } else {
      await insertRecord('logistics', eventId, {
        kind: form.stay_kind,
        detail: form.name,
      })
    }
    setForm({ kind: form.kind })
    refresh()
  }

  if (!canEdit && rooms.length === 0 && reservations.length === 0) {
    return <EmptyState title="Logistique" body="Aucun plan de salles pour cet événement." />
  }

  return (
    <div className="space-y-8">
      {canEdit && (
        <form onSubmit={add} className="card-panel grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="form-label" htmlFor="log-kind">Type</label>
            <select
              id="log-kind"
              className="select-field"
              value={form.kind}
              onChange={(e) => setForm({ kind: e.target.value })}
            >
              <option value="room">Salle</option>
              <option value="reservation">Réservation</option>
              <option value="resource">Équipement</option>
              <option value="stay">Hébergement / transport / restauration</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="log-name">Libellé</label>
            <input id="log-name" className="input-field" required value={form.name || ''} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          {form.kind === 'room' && (
            <div>
              <label className="form-label" htmlFor="log-cap">Capacité</label>
              <input id="log-cap" type="number" className="input-field" value={form.capacity || ''} onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))} />
            </div>
          )}
          {form.kind === 'reservation' && (
            <>
              <div>
                <label className="form-label" htmlFor="log-room">Salle</label>
                <input id="log-room" className="input-field" required value={form.room || ''} onChange={(e) => setForm((p) => ({ ...p, room: e.target.value }))} />
              </div>
              <div>
                <label className="form-label" htmlFor="log-start">Début</label>
                <input id="log-start" className="input-field font-mono" placeholder="10:00" value={form.start_slot || ''} onChange={(e) => setForm((p) => ({ ...p, start_slot: e.target.value }))} />
              </div>
              <div>
                <label className="form-label" htmlFor="log-end">Fin</label>
                <input id="log-end" className="input-field font-mono" placeholder="12:00" value={form.end_slot || ''} onChange={(e) => setForm((p) => ({ ...p, end_slot: e.target.value }))} />
              </div>
            </>
          )}
          {form.kind === 'stay' && (
            <div>
              <label className="form-label" htmlFor="log-stay">Catégorie</label>
              <select id="log-stay" className="select-field" value={form.stay_kind || 'accommodation'} onChange={(e) => setForm((p) => ({ ...p, stay_kind: e.target.value }))}>
                <option value="accommodation">Hébergement</option>
                <option value="transport">Transport</option>
                <option value="catering">Restauration</option>
              </select>
            </div>
          )}
          {conflict && <div className="alert-error sm:col-span-2">{conflict}</div>}
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">Enregistrer</button>
          </div>
        </form>
      )}

      <div>
        <p className="section-label mb-3">Plan des salles</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {rooms.map((room) => (
            <div key={room.id} className="border border-ink/10 rounded-xl p-4 bg-cream min-h-24">
              <p className="font-display font-semibold text-ink">{room.name}</p>
              <p className="font-mono text-xs text-taupe mt-2">{room.capacity || '—'} places</p>
            </div>
          ))}
          {rooms.length === 0 && <p className="text-sm text-taupe col-span-2">Aucune salle configurée.</p>}
        </div>
      </div>

      <div>
        <p className="section-label mb-3">Réservations</p>
        {conflicts.length > 0 && (
          <div className="alert-error mb-3">
            {conflicts.length} conflit{conflicts.length > 1 ? 's' : ''} de disponibilité détecté{conflicts.length > 1 ? 's' : ''}.
          </div>
        )}
        <ul className="space-y-2">
          {reservations.map((row) => (
            <li key={row.id} className="list-item">
              <span className="text-sm text-ink">
                {row.title} · {row.room}
              </span>
              <span className="font-mono text-xs text-taupe">
                {row.start_slot}–{row.end_slot}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="section-label mb-3">Équipements</p>
          <ul className="space-y-2">
            {resources.map((row) => (
              <li key={row.id} className="text-sm text-ink">
                {row.name} <span className="font-mono text-taupe">×{row.quantity || 1}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="section-label mb-3">Hébergement / transport / restauration</p>
          <ul className="space-y-2">
            {stay.map((row) => (
              <li key={row.id} className="text-sm text-ink">
                <span className="font-mono text-[10px] uppercase text-taupe mr-2">{row.kind}</span>
                {row.detail}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
