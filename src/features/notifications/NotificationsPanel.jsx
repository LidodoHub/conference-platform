import { useEffect, useState } from 'react'
import { insertRecord, loadRecords } from '../../lib/persist'

export default function NotificationsPanel({ event, participants, submissions, canManage }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [rows, setRows] = useState([])

  useEffect(() => {
    loadRecords('notifications', event.id).then((result) => setRows(result.rows))
  }, [event.id])

  const send = async (e) => {
    e.preventDefault()
    await insertRecord('notifications', event.id, { title, body })
    const emails = participants.map((p) => p.profiles?.email).filter(Boolean)
    if (emails.length) {
      window.location.href = `mailto:${emails.join(',')}?subject=${encodeURIComponent(`[${event.title}] ${title}`)}&body=${encodeURIComponent(body)}`
    }
    setTitle('')
    setBody('')
    const result = await loadRecords('notifications', event.id)
    setRows(result.rows)
  }

  const notifyAuthors = (status) => {
    const authors = submissions.filter((s) => s.status === status)
    const names = authors.map((s) => `${s.title} (${s.profiles?.full_name || 'auteur'})`).join('\n')
    window.location.href = `mailto:?subject=${encodeURIComponent(`Décision ${status} — ${event.title}`)}&body=${encodeURIComponent(names || 'Aucune communication dans cet état.')}`
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="section-label">Communication</p>
        <h2 className="section-heading text-xl mt-1">Annonces et notifications auteurs</h2>
      </div>

      {canManage && (
        <>
          <form onSubmit={send} className="card-panel space-y-3">
            <div>
              <label className="form-label" htmlFor="n-title">Objet</label>
              <input id="n-title" className="input-field" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="form-label" htmlFor="n-body">Message</label>
              <textarea id="n-body" className="textarea-field" rows={3} required value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary">Publier / e-mail</button>
          </form>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-outline btn-sm" onClick={() => notifyAuthors('accepted')}>Notifier les acceptés</button>
            <button type="button" className="btn-outline btn-sm" onClick={() => notifyAuthors('rejected')}>Notifier les rejetés</button>
            <button type="button" className="btn-outline btn-sm" onClick={() => notifyAuthors('revision_requested')}>Notifier les révisions</button>
          </div>
        </>
      )}

      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="list-item">
            <div>
              <p className="text-sm font-medium text-ink">{row.title}</p>
              <p className="text-xs text-taupe mt-1">{row.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
