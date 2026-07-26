import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function PaymentButton({ eventId }) {
  const [amount, setAmount] = useState(5000)
  const [paid, setPaid] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)

  const checkPaymentStatus = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .maybeSingle()

    if (!error && data) {
      setPaid(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    checkPaymentStatus()
  }, [eventId])

  const handlePay = async () => {
    setProcessing(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Tu dois être connecté')
      setProcessing(false)
      return
    }

    // Simulation : dans une vraie version, ici on appellerait Stripe/CIB
    // et on attendrait la confirmation avant de marquer "paid"
    const { error: insertError } = await supabase
      .from('payments')
      .insert({
        event_id: eventId,
        user_id: user.id,
        amount,
        currency: 'DZD',
        status: 'paid',
        payment_method: 'simulation',
        paid_at: new Date().toISOString(),
      })

    if (insertError) {
      setError(insertError.message)
      setProcessing(false)
      return
    }

    setPaid(true)
    setProcessing(false)
  }

  if (loading) return null

  return (
    <div>
      {paid ? (
        <p className="text-green-600 text-sm font-medium">
          ✓ Frais d'inscription payés ({amount} DZD)
        </p>
      ) : (
        <div>
          <button
            onClick={handlePay}
            disabled={processing}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {processing ? 'Traitement...' : `Payer les frais d'inscription (${amount} DZD)`}
          </button>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>
      )}
    </div>
  )
}