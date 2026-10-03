import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

const STATUS_LABELS = {
  invited: 'Invité',
  payment_submitted: 'Paiement déclaré',
  validated: 'Inscription validée',
}

const STATUS_BADGES = {
  invited: 'badge-pending',
  payment_submitted: 'badge-submitted',
  validated: 'badge-accepted',
}

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
    .sort((a, b) => dateOf(a).localeCompare(dateOf(b)))

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

      {editingSettings ? (
        <form onSubmit={saveSettings} className="card p-5 space-y-4 mb-6">
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
        <div className="card p-5 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="section-label">Frais d'inscription</p>
              <p className="font-mono text-sm text-ink mt-2">
                {Number(event?.registration_fee) > 0 ? `${event.registration_fee} DA` : 'Gratuit'}
              </p>
              {event?.payment_instructions && (
                <p
                  className="text-sm text-taupe mt-2 whitespace-pre-line"
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

      <form onSubmit={handleAddByEmail} className="card p-5 space-y-4 mb-6">
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

      <div className="mb-6">
        <p className="section-label mb-3">Auteurs acceptés</p>
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
                <li key={a.userId} className="list-item">
                  <div>
                    <span className="text-sm font-medium text-ink">{a.name}</span>
                    <span className="font-mono text-xs text-taupe ml-2">
                      {a.count} article{a.count > 1 ? 's' : ''} accepté{a.count > 1 ? 's' : ''}
                    </span>
                  </div>
                  {existing ? (
                    <span className={STATUS_BADGES[existing.registration_status] || 'badge-type'}>
                      {existing.role_in_event === 'participant'
                        ? STATUS_LABELS[existing.registration_status] || existing.registration_status
                        : 'Déjà membre'}
                    </span>
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
              return (
                <li key={p.id} className="list-item">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-ink block truncate">{p.profiles?.full_name}</span>
                    <span className="font-mono text-xs text-taupe block">
                      {dateOf(p)}
                      {pay && <> · bordereau {pay.reference}</>}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
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
                    <span className={STATUS_BADGES[p.registration_status] || 'badge-type'}>
                      {STATUS_LABELS[p.registration_status] || p.registration_status}
                    </span>
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