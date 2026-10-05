import { useState, useEffect } from 'react'
import { REGISTRATION_LABELS, REGISTRATION_COLOR } from '../../lib/constants'
import { supabase } from '../../lib/supabaseClient'
import Avatar from '../../components/ui/Avatar'
import Pill from '../../components/ui/Pill'

// les paiements à valider d'abord
const STATUS_ORDER = { payment_submitted: 0, invited: 1, validated: 2 }

const dateOf = (p) => (p.validated_at || p.invited_at || p.registered_at || '').split('T')[0]

export default function InvitationsPanel({ eventId, event, phase, submissions, participants, onRefresh }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('reviewer')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [payments, setPayments] = useState({})
  const [fee, setFee] = useState(String(event?.registration_fee ?? 0))
  const [instructions, setInstructions] = useState(event?.payment_instructions || '')
  const [editingSettings, setEditingSettings] = useState(
    !(Number(event?.registration_fee) > 0 || event?.payment_instructions),
  )

  const organizational = phase === 'organizational'
  const participantByUser = new Map(participants.map((p) => [p.user_id, p]))

  useEffect(() => {
    supabase
      .from('registration_payments')
      .select('user_id, reference, amount, declared_at, validated_at')
      .eq('event_id', eventId)
      .then(({ data }) => {
        setPayments(Object.fromEntries((data || []).map((x) => [x.user_id, x])))
      })
  }, [eventId, participants])

  // auteurs ayant au moins un article accepté
  const authorsMap = new Map()
  submissions
    .filter((s) => s.status === 'accepted')
    .forEach((s) => {
      const entry = authorsMap.get(s.author_id) || {
        userId: s.author_id,
        name: s.profiles?.full_name || 'Auteur',
        count: 0,
      }
      entry.count += 1
      authorsMap.set(s.author_id, entry)
    })
  const acceptedAuthors = [...authorsMap.values()]

  const registrants = participants
    .filter((p) => p.role_in_event === 'participant')
    .sort(
      (a, b) =>
        (STATUS_ORDER[a.registration_status] ?? 9) - (STATUS_ORDER[b.registration_status] ?? 9) ||
        dateOf(a).localeCompare(dateOf(b)),
    )

  const countStatus = (status) => registrants.filter((p) => p.registration_status === status).length

  const callRpc = async (fn, params, okMessage) => {
    setError(null)
    setInfo(null)
    setBusy(true)
    const { error: rpcError } = await supabase.rpc(fn, params)
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return false
    }
    if (okMessage) setInfo(okMessage)
    onRefresh()
    return true
  }

  const invite = ({ userId = null, mail = null, inviteRole }) =>
    callRpc(
      'invite_member',
      { p_event_id: eventId, p_role: inviteRole, p_user_id: userId, p_email: mail },
      inviteRole === 'reviewer' ? 'Reviewer ajouté.' : 'Invitation envoyée.',
    )

  const handleAddByEmail = async (e) => {
    e.preventDefault()
    const ok = await invite({ mail: email.trim(), inviteRole: role })
    if (ok) setEmail('')
  }

  const saveSettings = async (e) => {
    e.preventDefault()
    setError(null)
    setInfo(null)

    const amount = Number(fee)
    if (Number.isNaN(amount) || amount < 0) {
      setError('Montant invalide')
      return
    }

    setBusy(true)
    const { data, error: updateError } = await supabase
      .from('events')
      .update({ registration_fee: amount, payment_instructions: instructions.trim() || null })
      .eq('id', eventId)
      .select('id')
    setBusy(false)

    if (updateError) setError(updateError.message)
    else if (!data || data.length === 0) setError("Enregistrement refusé : tu n'es pas organisateur de cet événement.")
    else {
      setInfo('Frais enregistrés.')
      setEditingSettings(false)
      onRefresh()
    }
  }

  return (
    <section>
      <div className="mb-5">
        <p className="section-label">Inscriptions</p>
        <h2 className="section-heading text-xl mt-1">Invitations et inscrits</h2>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}
      {info && <div className="alert-success mb-4">{info}</div>}

      {/* Entonnoir d'inscription */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          ['Invités', countStatus('invited')],
          ['À valider', countStatus('payment_submitted')],
          ['Validés', countStatus('validated')],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="font-display text-3xl font-semibold leading-none">{value}</p>
            <p className="section-label mt-2">{label}</p>
          </div>
        ))}
      </div>

      {/* Frais */}
      {editingSettings ? (
        <form onSubmit={saveSettings} className="card p-5 sm:p-6 space-y-4 mb-6">
          <p className="section-label">Frais d'inscription</p>
          {Object.keys(payments).length > 0 && (
            <p className="text-xs text-taupe">
              Des paiements ont déjà été déclarés : leur montant ne change pas. Le nouveau montant ne s'applique qu'aux personnes qui n'ont pas encore payé.
            </p>
          )}
          <div>
            <label htmlFor="event-fee" className="form-label">Montant (DA, 0 = gratuit)</label>
            <input
              id="event-fee"
              type="number"
              min="0"
              step="any"
              className="input-field font-mono w-40"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="event-pay-instructions" className="form-label">Modalités de paiement</label>
            <textarea
              id="event-pay-instructions"
              className="textarea-field"
              rows={3}
              placeholder="Compte bancaire ou CCP, ordre du versement, à qui envoyer le bordereau…"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="btn-primary btn-sm">Enregistrer</button>
            <button
              type="button"
              className="btn-outline btn-sm"
              onClick={() => {
                setFee(String(event?.registration_fee ?? 0))
                setInstructions(event?.payment_instructions || '')
                setEditingSettings(false)
              }}
            >
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <div className="card p-5 sm:p-6 mb-6" style={{ borderLeft: '6px solid #C8963E' }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="section-label">Frais d'inscription</p>
              <p className="font-display text-3xl font-semibold text-ink mt-2">
                {Number(event?.registration_fee) > 0 ? `${event.registration_fee} DA` : 'Gratuit'}
              </p>
              {event?.payment_instructions && (
                <p
                  className="text-sm text-taupe mt-3 leading-6 whitespace-pre-line"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {event.payment_instructions}
                </p>
              )}
            </div>
            <button type="button" className="btn-outline btn-sm" onClick={() => setEditingSettings(true)}>
              Modifier
            </button>
          </div>
        </div>
      )}

      {/* Ajout par email */}
      <form onSubmit={handleAddByEmail} className="card p-5 sm:p-6 space-y-4 mb-6">
        <p className="section-label">Ajouter une personne par email</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
          <input
            type="email"
            className="input-field"
            placeholder="email du compte"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <select className="select-field w-auto" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="reviewer">Reviewer</option>
            <option value="participant" disabled={!organizational}>
              Participant{!organizational ? ' (après clôture)' : ''}
            </option>
          </select>
        </div>
        <button type="submit" disabled={busy} className="btn-primary btn-sm">
          {busy ? 'Envoi…' : 'Ajouter'}
        </button>
        <p className="text-xs text-taupe">
          La personne doit déjà avoir un compte. Les participants invités devront régler les frais pour valider leur inscription.
        </p>
      </form>

      {/* Auteurs acceptés */}
      <div className="mb-8">
        <div className="flex items-baseline gap-3 mb-3">
          <p className="section-label">Auteurs acceptés</p>
          <span className="font-mono text-xs text-taupe">{acceptedAuthors.length}</span>
        </div>
        {!organizational ? (
          <p className="text-sm text-taupe">
            Les invitations des auteurs s'ouvrent à la clôture de la phase scientifique.
          </p>
        ) : acceptedAuthors.length === 0 ? (
          <p className="text-sm text-taupe">Aucun auteur avec un article accepté.</p>
        ) : (
          <ul className="space-y-2">
            {acceptedAuthors.map((a) => {
              const existing = participantByUser.get(a.userId)
              return (
                <li key={a.userId} className="list-item" style={{ borderLeft: '4px solid #34C38F' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={a.name} size={38} tone="light" />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-ink block truncate">{a.name}</span>
                      <span className="font-mono text-xs text-taupe">
                        {a.count} article{a.count > 1 ? 's' : ''} accepté{a.count > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  {existing ? (
                    existing.role_in_event === 'participant' ? (
                      <Pill color={REGISTRATION_COLOR[existing.registration_status] || 'var(--color-st-muted)'}>
                        {REGISTRATION_LABELS[existing.registration_status] || existing.registration_status}
                      </Pill>
                    ) : (
                      <Pill color="#7FB3FF">Déjà membre</Pill>
                    )
                  ) : (
                    <button
                      type="button"
                      className="btn-ghost-gold btn-sm"
                      disabled={busy}
                      onClick={() => invite({ userId: a.userId, inviteRole: 'participant' })}
                    >
                      Inviter
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Inscrits */}
      <div>
        <div className="flex items-baseline gap-3 mb-3">
          <p className="section-label">Inscrits</p>
          <span className="font-mono text-xs text-taupe">{registrants.length}</span>
        </div>
        {registrants.length === 0 ? (
          <p className="text-sm text-taupe">Aucun participant invité pour l'instant.</p>
        ) : (
          <ul className="space-y-2">
            {registrants.map((p) => {
              const pay = payments[p.user_id]
              const color = REGISTRATION_COLOR[p.registration_status] || 'var(--color-st-muted)'
              return (
                <li key={p.id} className="list-item" style={{ borderLeft: `4px solid ${color}` }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={p.profiles?.full_name} size={38} tone="light" />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-ink block truncate">{p.profiles?.full_name}</span>
                      <span className="font-mono text-xs text-taupe block truncate">
                        {dateOf(p)}
                        {pay && <> · bordereau {pay.reference}</>}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    {p.registration_status === 'payment_submitted' && (
                      <>
                        <button
                          type="button"
                          className="btn-success btn-sm"
                          disabled={busy}
                          onClick={() =>
                            callRpc('validate_registration', { p_event_id: eventId, p_user_id: p.user_id }, 'Inscription validée.')
                          }
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          className="btn-danger btn-sm"
                          disabled={busy}
                          onClick={() =>
                            callRpc('reject_payment', { p_event_id: eventId, p_user_id: p.user_id }, 'Paiement refusé : la personne peut le redéclarer.')
                          }
                        >
                          Refuser
                        </button>
                      </>
                    )}
                    <Pill color={color}>{REGISTRATION_LABELS[p.registration_status] || p.registration_status}</Pill>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}