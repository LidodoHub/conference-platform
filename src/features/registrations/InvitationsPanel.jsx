import { useState, useEffect } from 'react'
import {
  PencilSimpleIcon,
  UserPlusIcon,
  CheckIcon,
  XIcon,
  CoinsIcon,
  TableIcon,
  SquaresFourIcon,
  MagnifyingGlassIcon,
  IdentificationCardIcon,
  CreditCardIcon,
  BankIcon,
  ReceiptIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { frError, writeError } from '../../lib/errors'
import { REGISTRATION_LABELS, REGISTRATION_COLOR, formatDate } from '../../lib/constants'
import Avatar from '../../components/ui/Avatar'
import Pill from '../../components/ui/Pill'
import Stat from '../../components/ui/Stat'
import SectionTitle from '../../components/ui/SectionTitle'
import EmptyState from '../../components/ui/EmptyState'
import Collapsible from '../../components/ui/Collapsible'


function parsePaymentInstructions(text) {
  const defaults = {
    method: 'ccp',
    ccpNumber: '',
    ccpKey: '',
    ccpOwner: '',
    ccpNote: 'Mentionner le nom du premier auteur et le titre de l’article sur le talon.',
    rip: '',
    baridiOwner: '',
    baridiNote: '',
    bankName: 'BNA',
    rib: '',
    bankOwner: '',
    bankNote: '',
    onsiteLocation: 'Hall central — Guichet d’accueil',
    onsiteNote: 'Règlement en espèces ou par bon de commande labo le premier jour.',
    customText: '',
  }

  if (!text) return defaults

  const isCcp = text.toLowerCase().includes('ccp')
  const isBaridi = text.toLowerCase().includes('baridimob')
  const isBank = text.toLowerCase().includes('virement bancaire') || text.toLowerCase().includes('rib')
  const isOnsite = text.toLowerCase().includes('sur place')
  const isFree = text.toLowerCase().includes('gratuit') || text.toLowerCase().includes('aucun paiement')

  const lines = text.split(/\r?\n/)
  const getLineVal = (prefix) => {
    const l = lines.find((line) => line.toLowerCase().includes(prefix.toLowerCase()))
    if (!l) return ''
    const parts = l.split(':')
    return parts.length > 1 ? parts.slice(1).join(':').trim() : ''
  }

  if (isCcp) {
    const ccpNumber = text.match(/(?:compte|n°|numéro)\s*(?:ccp)?\s*[:#]?\s*([0-9]{4,12})/i)?.[1] || ''
    const ccpKey = text.match(/(?:clé|cle)\s*[:#]?\s*([0-9]{2})/i)?.[1] || ''
    const ccpOwner = getLineVal('titulaire') || ''
    const ccpNote = getLineVal('consigne') || 'Mentionner le titre de l’article sur le talon de versement.'
    return { ...defaults, method: 'ccp', ccpNumber, ccpKey, ccpOwner, ccpNote, customText: text }
  }
  if (isBaridi) {
    const rip = text.match(/(?:rip)\s*[:#]?\s*([0-9]{15,25})/i)?.[1] || ''
    const baridiOwner = getLineVal('bénéficiaire') || getLineVal('titulaire') || ''
    const baridiNote = getLineVal('consigne') || ''
    return { ...defaults, method: 'baridimob', rip, baridiOwner, baridiNote, customText: text }
  }
  if (isBank) {
    const rib = text.match(/(?:rib)\s*[:#]?\s*([0-9A-Z]{15,25})/i)?.[1] || ''
    const bankName = text.match(/(?:banque|\()\s*([A-Za-z]+)\s*\)?/i)?.[1]?.trim() || 'BNA'
    const bankOwner = getLineVal('titulaire') || ''
    const bankNote = getLineVal('consigne') || ''
    return { ...defaults, method: 'bank', bankName, rib, bankOwner, bankNote, customText: text }
  }
  if (isOnsite) {
    const onsiteLocation = getLineVal('lieu') || 'Hall central — Guichet d’accueil'
    const onsiteNote = getLineVal('modalités') || 'Règlement en espèces ou bon de commande le premier jour.'
    return { ...defaults, method: 'onsite', onsiteLocation, onsiteNote, customText: text }
  }
  if (isFree) {
    return { ...defaults, method: 'free', customText: text }
  }
  return { ...defaults, method: 'custom', customText: text }
}

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
  const initialParsed = parsePaymentInstructions(event?.payment_instructions)
  const [payMethod, setPayMethod] = useState(initialParsed.method)
  const [ccpNumber, setCcpNumber] = useState(initialParsed.ccpNumber)
  const [ccpKey, setCcpKey] = useState(initialParsed.ccpKey)
  const [ccpOwner, setCcpOwner] = useState(initialParsed.ccpOwner)
  const [ccpNote, setCcpNote] = useState(initialParsed.ccpNote)
  const [rip, setRip] = useState(initialParsed.rip)
  const [baridiOwner, setBaridiOwner] = useState(initialParsed.baridiOwner)
  const [baridiNote, setBaridiNote] = useState(initialParsed.baridiNote)
  const [bankName, setBankName] = useState(initialParsed.bankName)
  const [rib, setRib] = useState(initialParsed.rib)
  const [bankOwner, setBankOwner] = useState(initialParsed.bankOwner)
  const [bankNote, setBankNote] = useState(initialParsed.bankNote)
  const [onsiteLocation, setOnsiteLocation] = useState(initialParsed.onsiteLocation)
  const [onsiteNote, setOnsiteNote] = useState(initialParsed.onsiteNote)
  const [customText, setCustomText] = useState(initialParsed.customText)
  const [editingSettings, setEditingSettings] = useState(!(Number(event?.registration_fee) > 0 || event?.payment_instructions))
  const [viewMode, setViewMode] = useState('table') // 'table' | 'cards'
  const [query, setQuery] = useState('')

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

  const q = query.trim().toLowerCase()
  const filteredRegistrants = registrants.filter((p) => {
    if (!q) return true
    const pay = payments[p.user_id]
    return (
      (p.profiles?.full_name || '').toLowerCase().includes(q) ||
      (p.profiles?.email || '').toLowerCase().includes(q) ||
      (pay?.reference || '').toLowerCase().includes(q)
    )
  })

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

  const invite = ({ userId = null, mail = null, inviteRole }) =>
    callRpc(
      'invite_member',
      { p_event_id: eventId, p_role: inviteRole, p_user_id: userId, p_email: mail },
      inviteRole === 'reviewer' ? 'Reviewer ajouté.' : 'Invitation enregistrée : elle apparaît dans le tableau de bord de la personne.',
    )

  const inviteAll = async () => {
    if (!toInvite.length) return
    if (!window.confirm(`Inviter les ${toInvite.length} auteurs acceptés ? Ils recevront une invitation pour déclarer leur inscription.`))
      return
    setError(null)
    setInfo(null)
    setBusy(true)
    for (const a of toInvite) {
      const { error: rpcError } = await supabase.rpc('invite_member', {
        p_event_id: eventId,
        p_role: 'participant',
        p_user_id: a.userId,
        p_email: null,
      })
      if (rpcError) {
        setError(`Erreur lors de l'invitation de ${a.name} : ${frError(rpcError)}`)
        setBusy(false)
        onRefresh()
        return
      }
    }
    setBusy(false)
    setInfo(`${toInvite.length} auteur(s) invité(s).`)
    onRefresh()
  }

  const handleAddByEmail = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    const ok = await invite({ mail: email.trim(), inviteRole: role })
    if (ok) setEmail('')
  }

  const saveSettings = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const finalFee = fee === '' ? 0 : Number(fee)
    let formatted
    if (finalFee === 0 || payMethod === 'free') {
      formatted = 'Participation gratuite — Aucun paiement requis.'
    } else if (payMethod === 'ccp') {
      formatted = 'Mode de règlement : Compte CCP (Algérie Poste)'
      if (ccpNumber.trim()) formatted += `\nN° Compte : ${ccpNumber.trim()}`
      if (ccpKey.trim()) formatted += ` — Clé : ${ccpKey.trim()}`
      if (ccpOwner.trim()) formatted += `\nTitulaire : ${ccpOwner.trim()}`
      if (ccpNote.trim()) formatted += `\nConsignes : ${ccpNote.trim()}`
    } else if (payMethod === 'baridimob') {
      formatted = 'Mode de règlement : BaridiMob (Algérie Poste)'
      if (rip.trim()) formatted += `\nRIP : ${rip.trim()}`
      if (baridiOwner.trim()) formatted += `\nBénéficiaire : ${baridiOwner.trim()}`
      if (baridiNote.trim()) formatted += `\nConsignes : ${baridiNote.trim()}`
    } else if (payMethod === 'bank') {
      formatted = `Mode de règlement : Virement bancaire (${bankName})`
      if (rib.trim()) formatted += `\nRIB : ${rib.trim()}`
      if (bankOwner.trim()) formatted += `\nTitulaire : ${bankOwner.trim()}`
      if (bankNote.trim()) formatted += `\nConsignes : ${bankNote.trim()}`
    } else if (payMethod === 'onsite') {
      formatted = 'Mode de règlement : Paiement sur place'
      if (onsiteLocation.trim()) formatted += `\nLieu : ${onsiteLocation.trim()}`
      if (onsiteNote.trim()) formatted += `\nModalités : ${onsiteNote.trim()}`
    } else {
      formatted = customText.trim()
    }

    const res = await supabase
      .from('events')
      .update({
        registration_fee: payMethod === 'free' ? 0 : finalFee,
        payment_instructions: formatted.trim() || null,
      })
      .eq('id', eventId)
      .select('id')
    setBusy(false)
    const msg = writeError(res, 'Mise à jour refusée.')
    if (msg) setError(msg)
    else {
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
        <SectionTitle title="Inscriptions & Paiements" />
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
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SectionTitle title="Inscrits" count={registrants.length} />

          <div className="flex items-center gap-2.5">
            <label className="relative sm:w-60">
              <span className="sr-only">Rechercher un inscrit</span>
              <MagnifyingGlassIcon
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                className="input-field pl-9.5 text-xs py-1.5"
                placeholder="Nom, email, bordereau…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            {/* Commutateur Tableau vs Cartes */}
            <div className="flex items-center rounded-xl border border-line bg-surface/80 p-0.5 shrink-0" aria-label="Format d'affichage">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table' ? 'bg-accent/20 text-accent-ink shadow-xs' : 'text-muted hover:text-fg'
                }`}
                title="Affichage en tableau"
                aria-label="Affichage en tableau"
              >
                <TableIcon size={17} weight={viewMode === 'table' ? 'fill' : 'regular'} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'cards' ? 'bg-accent/20 text-accent-ink shadow-xs' : 'text-muted hover:text-fg'
                }`}
                title="Affichage en lignes"
                aria-label="Affichage en lignes"
              >
                <SquaresFourIcon size={17} weight={viewMode === 'cards' ? 'fill' : 'regular'} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {registrants.length === 0 ? (
          <EmptyState compact icon={CoinsIcon} title="Personne n'est encore invité" body="Invite les auteurs acceptés une fois la phase scientifique close." />
        ) : filteredRegistrants.length === 0 ? (
          <EmptyState compact title="Aucun inscrit trouvé" body="Modifiez vos critères de recherche." />
        ) : viewMode === 'table' ? (
          /* --- VUE TABLEAU PLEINE LARGEUR --- */
          <div className="card overflow-hidden border-line rise">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-surface border-b border-line text-faint text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th scope="col" className="px-4 py-3">Participant</th>
                    <th scope="col" className="px-4 py-3">Bordereau / Référence</th>
                    <th scope="col" className="px-4 py-3">Montant</th>
                    <th scope="col" className="px-4 py-3">Date</th>
                    <th scope="col" className="px-4 py-3">Statut</th>
                    <th scope="col" className="px-4 py-3 text-right">Décision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredRegistrants.map((p) => {
                    const pay = payments[p.user_id]
                    const color = REGISTRATION_COLOR[p.registration_status] || 'var(--color-st-muted)'
                    return (
                      <tr key={p.id} className="hover:bg-fg/4 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar name={p.profiles?.full_name} size={32} />
                            <div>
                              <p className="font-semibold text-fg leading-tight">{p.profiles?.full_name || 'Sans nom'}</p>
                              <p className="text-xs text-muted leading-tight mt-0.5">{p.profiles?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono text-fg">
                          {pay?.reference ? (
                            <span className="font-semibold bg-fg/6 px-2 py-0.5 rounded border border-line">
                              {pay.reference}
                            </span>
                          ) : (
                            <span className="text-faint">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs font-medium num">
                          {pay?.amount != null ? `${Number(pay.amount).toLocaleString('fr-FR')} DA` : '—'}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-muted num">
                          {formatDate(dateOf(p), { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Pill color={color}>{REGISTRATION_LABELS[p.registration_status] || p.registration_status}</Pill>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          {p.registration_status === 'payment_submitted' ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button type="button" className="btn-danger btn-sm text-xs py-1" disabled={busy} onClick={() => refuse(p)}>
                                <XIcon size={13} weight="bold" aria-hidden="true" />
                                Refuser
                              </button>
                              <button type="button" className="btn-success btn-sm text-xs py-1" disabled={busy} onClick={() => validate(p)}>
                                <CheckIcon size={13} weight="bold" aria-hidden="true" />
                                Valider
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-faint font-medium">À jour</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* --- VUE LIGNES CLASSIQUE --- */
          <ul className="space-y-2 rise">
            {filteredRegistrants.map((p) => {
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
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-fg">Frais d'inscription</h3>
              <span className="text-[11px] font-semibold text-accent-ink px-2 py-0.5 rounded-full bg-accent/15">
                Choix guidé
              </span>
            </div>

            {/* Sélecteur de montant rapide */}
            <div>
              <label htmlFor="reg-fee" className="form-label">
                Montant des frais (DA)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {[
                  { label: 'Gratuit (0 DA)', value: 0 },
                  { label: '2 000 DA (Étudiant)', value: 2000 },
                  { label: '5 000 DA (Enseignant)', value: 5000 },
                  { label: '10 000 DA (Pro)', value: 10000 },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      setFee(String(preset.value))
                      if (preset.value === 0) setPayMethod('free')
                      else if (payMethod === 'free') setPayMethod('ccp')
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      Number(fee) === preset.value
                        ? 'bg-accent/20 border-accent/60 text-accent-ink font-semibold'
                        : 'border-line bg-surface hover:bg-fg/5 text-muted'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <input
                id="reg-fee"
                type="number"
                min="0"
                inputMode="numeric"
                className="input-field num"
                placeholder="0"
                value={fee}
                onChange={(e) => {
                  setFee(e.target.value)
                  if (Number(e.target.value) === 0) setPayMethod('free')
                  else if (payMethod === 'free') setPayMethod('ccp')
                }}
              />
            </div>

            {/* Choix du mode de paiement */}
            {Number(fee) > 0 && (
              <div className="space-y-3 pt-3 border-t border-line">
                <label className="form-label">Mode de règlement à proposer aux auteurs</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'ccp', label: 'Compte CCP', desc: 'Algérie Poste', icon: IdentificationCardIcon },
                    { id: 'baridimob', label: 'BaridiMob', desc: 'Virement RIP', icon: CreditCardIcon },
                    { id: 'bank', label: 'Virement', desc: 'RIB Banque', icon: BankIcon },
                    { id: 'onsite', label: 'Sur place', desc: 'Espèces / Bon', icon: ReceiptIcon },
                  ].map((m) => {
                    const Icon = m.icon
                    const active = payMethod === m.id
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPayMethod(m.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                          active
                            ? 'bg-accent/15 border-accent text-fg shadow-xs ring-1 ring-accent/30'
                            : 'bg-surface/50 border-line text-muted hover:border-fg/20'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon size={16} className={active ? 'text-accent-ink' : 'text-faint'} />
                          <span className="font-semibold text-xs text-fg">{m.label}</span>
                        </div>
                        <span className="text-[11px] text-muted">{m.desc}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Champs guidés selon le mode choisi */}
                {payMethod === 'ccp' && (
                  <div className="p-3.5 rounded-xl bg-surface/70 border border-line space-y-3 rise">
                    <span className="text-xs font-semibold text-accent-ink block uppercase tracking-wide">
                      Coordonnées Compte CCP (Algérie Poste)
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="form-label text-xs">N° Compte CCP</label>
                        <input
                          type="text"
                          className="input-field num text-xs"
                          placeholder="Ex: 12345678"
                          value={ccpNumber}
                          onChange={(e) => setCcpNumber(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="form-label text-xs">Clé</label>
                        <input
                          type="text"
                          maxLength={2}
                          className="input-field num text-xs"
                          placeholder="Ex: 90"
                          value={ccpKey}
                          onChange={(e) => setCcpKey(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="form-label text-xs">Nom du titulaire / À l'ordre de</label>
                      <input
                        type="text"
                        className="input-field text-xs"
                        placeholder="Ex: Association Scientifique USTO ou Trésorier"
                        value={ccpOwner}
                        onChange={(e) => setCcpOwner(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Consigne pour le talon de versement</label>
                      <input
                        type="text"
                        className="input-field text-xs"
                        placeholder="Mentionner le titre de l'article sur le talon"
                        value={ccpNote}
                        onChange={(e) => setCcpNote(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {payMethod === 'baridimob' && (
                  <div className="p-3.5 rounded-xl bg-surface/70 border border-line space-y-3 rise">
                    <span className="text-xs font-semibold text-accent-ink block uppercase tracking-wide">
                      Coordonnées BaridiMob
                    </span>
                    <div>
                      <label className="form-label text-xs">RIP BaridiMob (20 chiffres)</label>
                      <input
                        type="text"
                        className="input-field num text-xs"
                        placeholder="00799999..."
                        value={rip}
                        onChange={(e) => setRip(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Nom du bénéficiaire</label>
                      <input
                        type="text"
                        className="input-field text-xs"
                        placeholder="Ex: Trésorier de la conférence"
                        value={baridiOwner}
                        onChange={(e) => setBaridiOwner(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Consigne</label>
                      <input
                        type="text"
                        className="input-field text-xs"
                        placeholder="Ex: Envoyer la capture de transaction"
                        value={baridiNote}
                        onChange={(e) => setBaridiNote(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {payMethod === 'bank' && (
                  <div className="p-3.5 rounded-xl bg-surface/70 border border-line space-y-3 rise">
                    <span className="text-xs font-semibold text-accent-ink block uppercase tracking-wide">
                      Coordonnées Virement Bancaire
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="form-label text-xs">Banque</label>
                        <select
                          className="select-field text-xs"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                        >
                          <option value="BNA">BNA</option>
                          <option value="BEA">BEA</option>
                          <option value="CPA">CPA</option>
                          <option value="BADR">BADR</option>
                          <option value="BDL">BDL</option>
                          <option value="Autre">Autre</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="form-label text-xs">RIB (20 chiffres)</label>
                        <input
                          type="text"
                          className="input-field num text-xs"
                          placeholder="00...20 chiffres"
                          value={rib}
                          onChange={(e) => setRib(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="form-label text-xs">Titulaire du compte bancaire</label>
                      <input
                        type="text"
                        className="input-field text-xs"
                        placeholder="Ex: Faculté des Sciences / Université"
                        value={bankOwner}
                        onChange={(e) => setBankOwner(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Consigne pour le virement</label>
                      <input
                        type="text"
                        className="input-field text-xs"
                        placeholder="Ex: Mentionner l'article sur l'ordre de virement"
                        value={bankNote}
                        onChange={(e) => setBankNote(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {payMethod === 'onsite' && (
                  <div className="p-3.5 rounded-xl bg-surface/70 border border-line space-y-3 rise">
                    <span className="text-xs font-semibold text-accent-ink block uppercase tracking-wide">
                      Modalités de règlement sur place
                    </span>
                    <div>
                      <label className="form-label text-xs">Lieu de règlement sur place</label>
                      <input
                        type="text"
                        className="input-field text-xs"
                        placeholder="Ex: Guichet d'accueil — Hall de la conférence"
                        value={onsiteLocation}
                        onChange={(e) => setOnsiteLocation(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Modalités acceptées</label>
                      <input
                        type="text"
                        className="input-field text-xs"
                        placeholder="Ex: Espèces ou bon de commande labo le premier jour"
                        value={onsiteNote}
                        onChange={(e) => setOnsiteNote(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {payMethod === 'custom' && (
                  <div className="p-3.5 rounded-xl bg-surface/70 border border-line space-y-3 rise">
                    <label className="form-label text-xs">Instructions personnalisées</label>
                    <textarea
                      rows={3}
                      className="input-field text-xs"
                      placeholder="Saisissez vos instructions libres..."
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={busy} className="btn-primary">
                Enregistrer les frais
              </button>
              {(Number(event?.registration_fee) > 0 || event?.payment_instructions) && (
                <button type="button" className="btn-ghost" onClick={() => setEditingSettings(false)}>
                  Annuler
                </button>
              )}
            </div>
          </form>
        ) : (
          <section className="card-panel space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Frais d'inscription</span>
                <p className="num text-3xl font-semibold tracking-tight text-fg mt-1">
                  {Number(event?.registration_fee) > 0 ? `${Number(event.registration_fee).toLocaleString('fr-FR')} DA` : 'Gratuit'}
                </p>
              </div>
              <button type="button" className="btn-outline btn-sm" onClick={() => setEditingSettings(true)}>
                <PencilSimpleIcon size={15} aria-hidden="true" />
                Modifier
              </button>
            </div>
            {event?.payment_instructions ? (
              <Collapsible
                title="Consignes de règlement communiquées aux auteurs"
                subtitle="RIB, CCP ou modalités sur place"
                variant="subtle"
                defaultOpen={false}
              >
                <p className="text-muted leading-relaxed whitespace-pre-line font-mono text-xs bg-bg/60 p-3 rounded-lg border border-line/60 pt-2">
                  {event.payment_instructions}
                </p>
              </Collapsible>
            ) : (
              <p className="text-xs text-muted">
                Aucune instruction configurée. Cliquez sur Modifier pour sélectionner le compte CCP ou le mode de paiement.
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
