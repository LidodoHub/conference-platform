import { useState, useEffect } from 'react'
import { PencilSimpleIcon, UserPlusIcon, CheckIcon, XIcon, CoinsIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { frError, writeError } from '../../lib/errors'
import { REGISTRATION_LABELS, REGISTRATION_COLOR, formatDate } from '../../lib/constants'
import Avatar from '../../components/ui/Avatar'
import Pill from '../../components/ui/Pill'
import Stat from '../../components/ui/Stat'
import SectionTitle from '../../components/ui/SectionTitle'
import EmptyState from '../../components/ui/EmptyState'

// les paiements à valider d'abord
const STATUS_ORDER = { payment_submitted: 0, invited: 1, validated: 2 }
const dateOf = (p) => p.validated_at || p.invited_at || p.registered_at || ''

export default function InvitationsPanel({ eventId, event, phase, submissions, participants, onRefresh }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('reviewer')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [payments, setPayments] = useState({})
  const [fee, setFee] = useState(String(event?.registration_fee ?? 0))
  const [instructions, setInstructions] = useState(event?.payment_instructions || '')
  const [editingSettings, setEditingSettings] = useState(!(Number(event?.registration_fee) > 0 || event?.payment_instructions))

  const organizational = phase === 'organizational'
  const participantByUser = new Map(participants.map((p) => [p.user_id, p]))

  useEffect(() => {
    supabase
      .from('registration_payments')
      .select('user_id, reference, amount, declared_at, validated_at')
      .eq('event_id', eventId)
      .then(({ data }) => setPayments(Object.fromEntries((data || []).map((x) => [x.user_id, x]))))
  }, [eventId, participants])

  // auteurs ayant au moins un article accepté
  const authorsMap = new Map()
  submissions
    .filter((s) => s.status === 'accepted')
    .forEach((s) => {
      const entry = authorsMap.get(s.author_id) || { userId: s.author_id, name: s.profiles?.full_name || 'Auteur', count: 0 }
      entry.count += 1
      authorsMap.set(s.author_id, entry)
    })
  const acceptedAuthors = [...authorsMap.values()]
  const toInvite = acceptedAuthors.filter((a) => !participantByUser.has(a.userId))

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
      setError(frError(rpcError))
      return false
    }
    if (okMessage) setInfo(okMessage)
    onRefresh()
    return true
  }

  // Aucune notification n'est envoyée : la personne voit l'invitation dans son tableau de bord.
  const invite = ({ userId = null, mail = null, inviteRole }) =>
    callRpc(
      'invite_member',
      { p_event_id: eventId, p_role: inviteRole, p_user_id: userId, p_email: mail },
      inviteRole === 'reviewer' ? 'Reviewer ajouté.' : 'Invitation enregistrée : elle apparaît dans le tableau de bord de la personne.',
    )

  const inviteAll = async () => {
    if (!window.confirm(`Inviter les ${toInvite.length} auteurs acceptés pas encore invités ?`)) return
    for (const a of toInvite) {
      const ok = await invite({ userId: a.userId, inviteRole: 'participant' })
      if (!ok) break
    }
  }

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
      setError('Montant invalide.')
      return
    }
    setBusy(true)
    const res = await supabase
      .from('events')
      .update({ registration_fee: amount, payment_instructions: instructions.trim() || null })
      .eq('id', eventId)
      .select('id')
    setBusy(false)
    const msg = writeError(res, "Enregistrement refusé : tu n'es pas organisateur de cet événement.")
    if (msg) setError(msg)
    else {
      setInfo('Frais enregistrés.')
      setEditingSettings(false)
      onRefresh()
    }
  }

  const validate = (p) => callRpc('validate_registration', { p_event_id: eventId, p_user_id: p.user_id }, `Inscription de ${p.profiles?.full_name} validée.`)
  const refuse = (p) => {
    if (!window.confirm(`Refuser le paiement de ${p.profiles?.full_name} ? La personne pourra déclarer une nouvelle référence.`)) return
    callRpc('reject_payment', { p_event_id: eventId, p_user_id: p.user_id }, 'Paiement refusé : la personne peut le redéclarer.')
  }

  return (
    <div className="space-y-10">
      <div>
        <SectionTitle title="Inscriptions" description="Invitations, frais d'inscription et validation des paiements." />
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Invités" value={countStatus('invited')} />
          <Stat label="À valider" value={countStatus('payment_submitted')} tone={countStatus('payment_submitted') ? 'var(--color-warn)' : undefined} />
          <Stat label="Validés" value={countStatus('validated')} />
        </div>
      </div>

      {error && (
        <div role="alert" className="alert-error">
          {error}
        </div>
      )}
      {info && (
        <div role="status" className="alert-success">
          {info}
        </div>
      )}

      {/* Inscrits */}
      <section>
        <SectionTitle title="Inscrits" count={registrants.length} />
        {registrants.length === 0 ? (
          <EmptyState compact icon={CoinsIcon} title="Personne n'est encore invité" body="Invite les auteurs acceptés une fois la phase scientifique close." />
        ) : (
          <ul className="space-y-2">
            {registrants.map((p) => {
              const pay = payments[p.user_id]
              const color = REGISTRATION_COLOR[p.registration_status] || 'var(--color-st-muted)'
              return (
                <li key={p.id} className="row" style={{ '--stripe': color }}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar name={p.profiles?.full_name} size={36} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-fg truncate">{p.profiles?.full_name}</p>
                      <p className="text-[13px] text-muted truncate">
                        {pay ? (
                          <>
                            Bordereau <span className="num font-medium text-fg">{pay.reference}</span>
                            {pay.amount != null && <span className="num"> · {Number(pay.amount).toLocaleString('fr-FR')} DA</span>}
                          </>
                        ) : (
                          <span className="num">{formatDate(dateOf(p), { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {p.registration_status === 'payment_submitted' ? (
                      <>
                        <button type="button" className="btn-danger btn-sm" disabled={busy} onClick={() => refuse(p)}>
                          <XIcon size={14} weight="bold" aria-hidden="true" />
                          Refuser
                        </button>
                        <button type="button" className="btn-success btn-sm" disabled={busy} onClick={() => validate(p)}>
                          <CheckIcon size={14} weight="bold" aria-hidden="true" />
                          Valider
                        </button>
                      </>
                    ) : (
                      <Pill color={color}>{REGISTRATION_LABELS[p.registration_status] || p.registration_status}</Pill>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Auteurs acceptés */}
      <section>
        <SectionTitle
          title="Auteurs acceptés"
          count={acceptedAuthors.length}
          description={!organizational ? "Les invitations s'ouvrent à la clôture de la phase scientifique." : null}
          actions={
            organizational &&
            toInvite.length > 1 && (
              <button type="button" className="btn-outline btn-sm" disabled={busy} onClick={inviteAll}>
                Inviter les {toInvite.length}
              </button>
            )
          }
        />
        {acceptedAuthors.length === 0 ? (
          <p className="text-sm text-muted">Aucun article accepté pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {acceptedAuthors.map((a) => {
              const existing = participantByUser.get(a.userId)
              return (
                <li key={a.userId} className="row">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar name={a.name} size={36} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-fg truncate">{a.name}</p>
                      <p className="text-[13px] text-muted">
                        {a.count} article{a.count > 1 ? 's' : ''} accepté{a.count > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {existing ? (
                    existing.role_in_event === 'participant' ? (
                      <Pill color={REGISTRATION_COLOR[existing.registration_status]}>
                        {REGISTRATION_LABELS[existing.registration_status] || existing.registration_status}
                      </Pill>
                    ) : (
                      <span className="text-[13px] text-muted">Déjà membre</span>
                    )
                  ) : (
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      disabled={busy || !organizational}
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
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Frais */}
        {editingSettings ? (
          <form onSubmit={saveSettings} className="card-panel space-y-5">
            <h3 className="font-semibold text-fg">Frais d'inscription</h3>
            {Object.keys(payments).length > 0 && (
              <p className="alert-info">Des paiements ont déjà été déclarés : un changement ne modifie pas les montants déjà enregistrés.</p>
            )}
            <div>
              <label htmlFor="reg-fee" className="form-label">
                Montant (DA)
              </label>
              <input id="reg-fee" type="number" min="0" step="1" inputMode="numeric" className="input-field num" value={fee} onChange={(e) => setFee(e.target.value)} required />
              <p className="form-hint">0 pour une inscription gratuite.</p>
            </div>
            <div>
              <label htmlFor="reg-instructions" className="form-label">
                Modalités de paiement
              </label>
              <textarea id="reg-instructions" className="textarea-field" rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
              <p className="form-hint">Compte, RIB ou CCP, et ce que l'invité doit indiquer sur le bordereau.</p>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="btn-primary">
                Enregistrer
              </button>
              {(Number(event?.registration_fee) > 0 || event?.payment_instructions) && (
                <button type="button" className="btn-ghost" onClick={() => setEditingSettings(false)}>
                  Annuler
                </button>
              )}
            </div>
          </form>
        ) : (
          <section className="card-panel">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm text-muted">Frais d'inscription</h3>
                <p className="num text-3xl font-semibold tracking-tight text-fg mt-1">
                  {Number(event?.registration_fee) > 0 ? `${Number(event.registration_fee).toLocaleString('fr-FR')} DA` : 'Gratuit'}
                </p>
              </div>
              <button type="button" className="btn-outline btn-sm" onClick={() => setEditingSettings(true)}>
                <PencilSimpleIcon size={15} aria-hidden="true" />
                Modifier
              </button>
            </div>
            {event?.payment_instructions && (
              <p className="text-sm text-muted mt-4 leading-6 whitespace-pre-line" style={{ overflowWrap: 'anywhere' }}>
                {event.payment_instructions}
              </p>
            )}
          </section>
        )}

        {/* Ajout par email */}
        <form onSubmit={handleAddByEmail} className="card-panel space-y-5">
          <h3 className="font-semibold text-fg">Ajouter une personne</h3>
          <div>
            <label htmlFor="invite-email" className="form-label">
              Email du compte
            </label>
            <input id="invite-email" type="email" inputMode="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <p className="form-hint">La personne doit déjà avoir un compte CONFERA.</p>
          </div>
          <div>
            <label htmlFor="invite-role" className="form-label">
              Rôle
            </label>
            <select id="invite-role" className="select-field" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="reviewer">Reviewer (à tout moment)</option>
              <option value="participant" disabled={!organizational}>
                Participant{!organizational ? ' (après clôture de la phase scientifique)' : ''}
              </option>
            </select>
          </div>
          <button type="submit" disabled={busy} className="btn-primary">
            <UserPlusIcon size={16} aria-hidden="true" />
            Ajouter
          </button>
        </form>
      </div>
    </div>
  )
}
