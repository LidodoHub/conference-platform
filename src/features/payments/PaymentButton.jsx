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
        <div className="alert-success">
          Frais d'inscription payés —{' '}
          <span className="font-mono">{amount.toLocaleString('fr-DZ')} DZD</span>
        </div>
      ) : (
        <div>
          <button
            onClick={handlePay}
            disabled={processing}
            className="btn-outline w-full"
          >
            {processing ? 'Traitement…' : (
              <>
                Payer les frais d'inscription
                <span className="font-mono text-xs opacity-70">
                  ({amount.toLocaleString('fr-DZ')} DZD)
                </span>
              </>
            )}
          </button>
          {error && <div className="alert-error mt-3">{error}</div>}
        </div>
      )}
    </div>
  )
}
