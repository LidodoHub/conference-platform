import { useEffect, useState } from 'react'
import { insertRecord, loadRecords } from '../../lib/persist'
import jsPDF from 'jspdf'

export default function EvaluationPanel({ event, submissions, participants }) {
  const [score, setScore] = useState(4)
  const [comment, setComment] = useState('')
  const [rows, setRows] = useState([])

  useEffect(() => {
    loadRecords('event_evaluations', event.id).then((result) => setRows(result.rows))
  }, [event.id])

  const save = async (e) => {
    e.preventDefault()
    await insertRecord('event_evaluations', event.id, { score, comment })
    const result = await loadRecords('event_evaluations', event.id)
    setRows(result.rows)
    setComment('')
  }

  const exportReport = () => {
    const accepted = submissions.filter((s) => s.status === 'accepted').length
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Rapport final de conférence', 20, 22)
    doc.setFontSize(11)
    doc.text(event.title, 20, 34)
    doc.text(`Statut : ${event.status}`, 20, 44)
    doc.text(`Participants : ${participants.length}`, 20, 54)
    doc.text(`Soumissions : ${submissions.length} (acceptées : ${accepted})`, 20, 64)
    if (rows[0]) {
      doc.text(`Évaluation moyenne déclarée : ${rows[0].score}/5`, 20, 74)
      doc.text(rows[0].comment || '', 20, 84, { maxWidth: 170 })
    }
    doc.save(`rapport-${event.title.replace(/\s+/g, '-')}.pdf`)
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="section-label">Clôture</p>
        <h2 className="section-heading text-xl mt-1">Évaluation et rapport final</h2>
      </div>

      <form onSubmit={save} className="card-panel space-y-4">
        <div>
          <label className="form-label" htmlFor="eval-score">Note globale (1–5)</label>
          <input id="eval-score" type="number" min="1" max="5" className="input-field font-mono w-24" value={score} onChange={(e) => setScore(Number(e.target.value))} />
        </div>
        <div>
          <label className="form-label" htmlFor="eval-comment">Bilan</label>
          <textarea id="eval-comment" className="textarea-field" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Points forts, incidents, recommandations d'archivage." />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary">Enregistrer l'évaluation</button>
          <button type="button" className="btn-outline" onClick={exportReport}>Exporter le rapport PDF</button>
        </div>
      </form>

      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="list-item">
              <p className="text-sm text-ink">Note {row.score}/5 — {row.comment}</p>
              <span className="font-mono text-[10px] text-taupe">{(row.created_at || '').slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
