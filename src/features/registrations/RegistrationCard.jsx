import { useState, useEffect } from 'react'
import { CheckCircleIcon, HourglassIcon, ReceiptIcon, TicketIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { frError } from '../../lib/errors'
import { slug } from '../../lib/constants'
import { useLanguage } from '../../context/LanguageContext'
import CertificateButton from '../certificates/CertificateButton'
import AttendanceBadge from '../attendance/AttendanceBadge'

export default function RegistrationCard({ event, participants, onRefresh }) {
  const { t, locale } = useLanguage()
  const myId = useAuth().user?.id ?? null
  const [payment, setPayment] = useState(null)
  const [payType, setPayType] = useState('ccp')
  const [reference, setReference] = useState('')
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const mine = participants.find((p) => p.user_id === myId)
  const status = mine?.registration_status
  const isParticipant = mine?.role_in_event === 'participant'
  const needsPayment = Boolean(myId && isParticipant && status !== 'invited')

  useEffect(() => {
    if (!needsPayment) return
    supabase
      .from('registration_payments')
      .select('reference, amount, declared_at, validated_at')
      .eq('event_id', event.id)
      .eq('user_id', myId)
      .maybeSingle()
      .then(({ data }) => setPayment(data))
  }, [needsPayment, myId, status, event.id])

  const fee = Number(event.registration_fee || 0)
  const free = fee === 0

  const declare = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error: rpcError } = await supabase.rpc('declare_payment', {
      p_event_id: event.id,
      p_reference: free
        ? t('registrationCard.freeRef')
        : payType === 'ccp'
        ? t('registrationCard.ccpPrefix', { ref: reference.trim() })
        : payType === 'baridimob'
        ? t('registrationCard.baridimobPrefix', { ref: reference.trim() })
        : payType === 'bank'
        ? t('registrationCard.bankPrefix', { ref: reference.trim() })
        : payType === 'onsite'
        ? t('registrationCard.onsitePrefix', { ref: reference.trim() })
        : reference.trim(),
    })
    setBusy(false)
    if (rpcError) {
      setError(frError(rpcError))
      return
    }
    setReference('')
    setEditing(false)
    onRefresh()
  }

  const downloadReceipt = async () => {
    const { receiptPDF } = await import('../certificates/pdf')
    receiptPDF({
      eventTitle: event.title,
      participantName: mine?.profiles?.full_name || '',
      reference: payment?.reference,
      amount: payment?.amount,
      declaredAt: payment?.declared_at,
      validatedAt: payment?.validated_at,
    }).save(`${t('registrationCard.receiptPrefix')}-${slug(event.title)}.pdf`)
  }

  if (!myId) return null

  if (!mine) {
    return (
      <p className="text-sm text-muted leading-relaxed">
        {t('registrationCard.notInvited')}
      </p>
    )
  }

  if (!isParticipant) {
    return (
      <p className="text-sm text-muted leading-relaxed">
        {t('registrationCard.memberRolePrefix')}{' '}
        <span className="font-medium text-fg">{t(`roles.${mine.role_in_event}`)?.toLowerCase()}</span>.
      </p>
    )
  }

  if (status === 'validated') {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm font-medium text-ok">
          <CheckCircleIcon size={18} weight="fill" aria-hidden="true" />
          {t('registrationCard.validatedTitle')}
        </p>
        {event.format !== 'online' ? (
          <AttendanceBadge event={event} name={mine?.profiles?.full_name || ''} />
        ) : (
          <p className="text-sm text-muted">{t('registrationCard.onlineInfo')}</p>
        )}
        <div className="grid gap-2">
          {payment && (
            <button type="button" className="btn-outline w-full" onClick={downloadReceipt}>
              <ReceiptIcon size={17} aria-hidden="true" />
              {t('registrationCard.receiptPdfBtn')}
            </button>
          )}
          <CertificateButton event={event} />
        </div>
      </div>
    )
  }

  const form = (
    <form onSubmit={declare} className="space-y-3">
      {!free && (
        <div className="space-y-2.5">
          <div>
            <label htmlFor="pay-type-select" className="form-label text-xs">
              {t('registrationCard.payTypeLabel')}
            </label>
            <select
              id="pay-type-select"
              className="select-field text-xs"
              value={payType}
              onChange={(e) => setPayType(e.target.value)}
            >
              <option value="ccp">{t('registrationCard.payTypes.ccp')}</option>
              <option value="baridimob">{t('registrationCard.payTypes.baridimob')}</option>
              <option value="bank">{t('registrationCard.payTypes.bank')}</option>
              <option value="onsite">{t('registrationCard.payTypes.onsite')}</option>
              <option value="other">{t('registrationCard.payTypes.other')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="payment-ref" className="form-label text-xs">
              {t(`registrationCard.payRefLabels.${payType}`)}
            </label>
            <input
              id="payment-ref"
              className="input-field num text-xs"
              placeholder={t(`registrationCard.payRefPlaceholders.${payType}`)}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              required
            />
          </div>
        </div>
      )}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? t('registrationCard.sending') : free ? t('registrationCard.confirmFree') : t('registrationCard.declarePayment')}
      </button>
    </form>
  )

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="alert-error">
          {error}
        </div>
      )}

      {status === 'payment_submitted' ? (
        <>
          <p className="flex items-start gap-2 text-sm text-fg">
            <HourglassIcon size={18} className="text-warn shrink-0" aria-hidden="true" />
            <span>
              {t('registrationCard.paymentSubmittedPrefix')}
              {payment?.reference && (
                <>
                  {' '}
                  {t('registrationCard.paymentSubmittedSlip', { ref: '' })}
                  <span className="num font-medium">{payment.reference}</span>
                </>
              )}
              {t('registrationCard.paymentSubmittedSuffix')}
            </span>
          </p>
          {editing ? (
            form
          ) : (
            <button type="button" className="btn-ghost btn-sm -ms-2" onClick={() => setEditing(true)}>
              {t('registrationCard.fixReference')}
            </button>
          )}
        </>
      ) : (
        <>
          <p className="flex items-start gap-2 text-sm text-fg">
            <TicketIcon size={18} className="text-accent-ink shrink-0" aria-hidden="true" />
            {t('registrationCard.invitedPrompt')}
          </p>
          <div className="rounded-xl bg-surface-2/70 border border-line p-3.5">
            <p className="text-xs text-muted">{t('registrationCard.feeLabel')}</p>
            <p className="num text-2xl font-semibold tracking-tight text-fg">
              {free ? t('registrationCard.free') : `${fee.toLocaleString(locale)} ${t('registrationCard.currency')}`}
            </p>
            {event.payment_instructions && (
              <p className="text-[13px] text-muted mt-2 whitespace-pre-line leading-5" style={{ overflowWrap: 'anywhere' }}>
                {event.payment_instructions}
              </p>
            )}
          </div>
          {form}
        </>
      )}
    </div>
  )
}
