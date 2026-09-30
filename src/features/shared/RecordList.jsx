import { useEffect, useState } from 'react'
import { loadRecords, insertRecord, updateRecord, deleteRecord } from '../../lib/persist'
import EmptyState from '../../components/ui/EmptyState'

export default function RecordList({
  table,
  eventId,
  title,
  label,
  fields,
  canEdit,
  renderItem,
}) {
  const [rows, setRows] = useState([])
  const [source, setSource] = useState('supabase')
  const [form, setForm] = useState({})
  const [error, setError] = useState(null)

  const refresh = async () => {
    const result = await loadRecords(table, eventId)
    setRows(result.rows)
    setSource(result.source)
  }

  useEffect(() => {
    refresh()
  }, [table, eventId])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const { error: insertError } = await insertRecord(table, eventId, form)
    if (insertError) setError(insertError.message)
    setForm({})
    refresh()
  }

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <p className="section-label">{label}</p>
          <h2 className="section-heading text-xl mt-1">{title}</h2>
        </div>
        {source === 'local' && (
          <span className="font-mono text-[10px] text-taupe">stockage local (table absente)</span>
        )}
      </div>

      {canEdit && (
        <form onSubmit={onSubmit} className="card-panel mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map((field) => (
            <div key={field.name} className={field.full ? 'sm:col-span-2' : ''}>
              <label className="form-label" htmlFor={`${table}-${field.name}`}>{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  id={`${table}-${field.name}`}
                  className="textarea-field"
                  rows={2}
                  required={field.required}
                  value={form[field.name] || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
                />
              ) : (
                <input
                  id={`${table}-${field.name}`}
                  type={field.type || 'text'}
                  className="input-field"
                  required={field.required}
                  value={form[field.name] || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
                />
              )}
            </div>
          ))}
          {error && <div className="alert-error sm:col-span-2">{error}</div>}
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">Ajouter</button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <EmptyState title="Aucune donnée" body="Ajoutez un premier élément pour constituer ce module." />
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="list-item">
              <div className="min-w-0">
                {renderItem(row)}
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  {row.status && (
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => {
                        const next = row.status === 'open' ? 'closed' : 'open'
                        updateRecord(table, eventId, row.id, { status: next }).then(refresh)
                      }}
                    >
                      {row.status}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-ghost btn-sm text-error"
                    onClick={() => deleteRecord(table, eventId, row.id).then(refresh)}
                  >
                    Retirer
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
