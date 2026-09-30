import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import jsPDF from 'jspdf'
import EmptyState from '../../components/ui/EmptyState'

function invoicePdf(payment, eventTitle) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('CONFERA — Reçu de paiement', 20, 24)
  doc.setFontSize(11)
  doc.text(`Événement : ${eventTitle}`, 20, 40)
  doc.text(`Montant : ${payment.amount} ${payment.currency || 'DZD'}`, 20, 50)
  doc.text(`Statut : ${payment.status}`, 20, 60)
  doc.text(`Date : ${payment.paid_at || payment.created_at || '—'}`, 20, 70)
  doc.text(`Référence : ${payment.id}`, 20, 80)
  doc.save(`recu-${payment.id}.pdf`)
}

export default function PaymentsPanel({ eventId, eventTitle, canManage }) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)

  const load = async () => {
    const { data, error: loadError } = await supabase
      .from('payments')
      .select('*, profiles(full_name, email)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (loadError) {
      const fallback = await supabase.from('payments').select('*').eq('event_id', eventId)
      setRows(fallback.data || [])
      return
    }
    setRows(data || [])
  }

  useEffect(() => {
    load()
  }, [eventId])

  const verify = async (id) => {
    setError(null)
    const { error: updateError } = await supabase.from('payments').update({ status: 'paid' }).eq('id', id)
    if (updateError) setError(updateError.message)
    load()
  }

  const refund = async (id) => {
    setError(null)
    const { error: updateError } = await supabase.from('payments').update({ status: 'refunded' }).eq('id', id)
    if (updateError) setError(updateError.message)
    load()
  }

  if (!canManage) {
    return <EmptyState title="Paiements" body="Réservé à l'organisateur et à l'administrateur." />
  }

  return (
    <section>
      <p className="section-label">Finances</p>
      <h2 className="section-heading text-xl mt-1 mb-5">Paiements, reçus, remboursements</h2>
      {error && <div className="alert-error mb-4">{error}</div>}
      {rows.length === 0 ? (
        <EmptyState title="Aucun paiement" body="Les reçus apparaîtront après les inscriptions payées." />
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="list-item">
              <div>
                <p className="text-sm font-medium text-ink">
                  {row.profiles?.full_name || row.user_id}
                </p>
                <p className="font-mono text-xs text-taupe mt-1">
                  {row.amount} {row.currency || 'DZD'} · {row.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-outline btn-sm" onClick={() => invoicePdf(row, eventTitle)}>
                  Reçu
                </button>
                {row.status !== 'paid' && row.status !== 'refunded' && (
                  <button type="button" className="btn-success btn-sm" onClick={() => verify(row.id)}>
                    Vérifier
                  </button>
                )}
                {row.status === 'paid' && (
                  <button type="button" className="btn-danger btn-sm" onClick={() => refund(row.id)}>
                    Rembourser
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
