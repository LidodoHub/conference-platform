import { useState, useMemo, useEffect } from 'react'
import {
  XIcon,
  EnvelopeSimpleIcon,
  UsersThreeIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  BookmarkSimpleIcon,
  CheckIcon,
  ClockCounterClockwiseIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useLanguage } from '../../context/LanguageContext'
import { useOrganizerNetwork } from '../../hooks/useOrganizerNetwork'
import { useModalBehavior } from '../../hooks/useModalBehavior'
import Avatar from '../../components/ui/Avatar'

const INVITE_ROLES = ['reviewer', 'organizer', 'participant']

export default function InviteMemberModal({
  open,
  onClose,
  eventId,
  eventTitle,
  existingParticipantIds = [],
  onInvited,
}) {
  const { t } = useLanguage()
  useModalBehavior(open, onClose)
  const { networkMembers, pastEvents } = useOrganizerNetwork()

  const [tab, setTab] = useState('email') // 'email' | 'network'
  const [role, setRole] = useState('reviewer')
  const [email, setEmail] = useState('')
  const [search, setSearch] = useState('')
  const [selectedPastEventId, setSelectedPastEventId] = useState('')
  const [selectedImportIds, setSelectedImportIds] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const [invitingId, setInvitingId] = useState(null)
  const [invitedIds, setInvitedIds] = useState(() => new Set())
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setSuccess(null)
      setRole('reviewer')
      setEmail('')
      setSearch('')
      setSelectedPastEventId('')
      setSelectedImportIds(new Set())
      setInvitedIds(new Set())
    }
  }, [open, eventId])

  const existingSet = useMemo(
    () => new Set(existingParticipantIds),
    [existingParticipantIds],
  )

  const filteredNetwork = useMemo(() => {
    const q = search.trim().toLowerCase()
    return networkMembers.filter((m) => {
      if (!q) return true
      const hay = `${m.full_name || ''} ${m.email || ''} ${m.affiliation || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [networkMembers, search])

  const importableEvents = useMemo(
    () => pastEvents.filter((ev) => ev.id !== eventId && ev.members.length > 0),
    [pastEvents, eventId],
  )

  const importCandidates = useMemo(() => {
    const ev = importableEvents.find((e) => e.id === selectedPastEventId)
    if (!ev) return []
    return ev.members.filter((m) => !existingSet.has(m.id) && !invitedIds.has(m.id))
  }, [importableEvents, selectedPastEventId, existingSet, invitedIds])

  if (!open) return null

  const sendByEmail = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setError(null)
    setSuccess(null)
    setBusy(true)
    const { error: rpcError } = await supabase.rpc('invite_member', {
      p_event_id: eventId,
      p_role: role,
      p_user_id: null,
      p_email: email.trim(),
    })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message || t('errors.saveRefused'))
      return
    }
    setEmail('')
    setSuccess(t('researchers.inviteSuccess', { role: t(`roles.${role}`) }))
    onInvited?.()
  }

  const inviteOne = async (member) => {
    setError(null)
    setSuccess(null)
    setInvitingId(member.id)
    const { error: rpcError } = await supabase.rpc('invite_member', {
      p_event_id: eventId,
      p_role: role,
      p_user_id: member.id,
      p_email: member.email,
    })
    setInvitingId(null)
    if (rpcError) {
      setError(rpcError.message || t('errors.saveRefused'))
      return
    }
    setInvitedIds((prev) => new Set(prev).add(member.id))
    setSuccess(t('researchers.inviteSuccess', { role: t(`roles.${role}`) }))
    onInvited?.()
  }

  const inviteSelectedFromPastEvent = async () => {
    if (selectedImportIds.size === 0) return
    setError(null)
    setSuccess(null)
    setBusy(true)
    const targets = importCandidates.filter((m) => selectedImportIds.has(m.id))
    let count = 0
    for (const member of targets) {
      const { error: rpcError } = await supabase.rpc('invite_member', {
        p_event_id: eventId,
        p_role: role,
        p_user_id: member.id,
        p_email: member.email,
      })
      if (rpcError) {
        setError(rpcError.message || t('errors.saveRefused'))
        break
      }
      count += 1
      setInvitedIds((prev) => new Set(prev).add(member.id))
    }
    setBusy(false)
    if (count > 0) {
      setSelectedImportIds(new Set())
      setSuccess(t('network.bulkInviteSuccess', { count, role: t(`roles.${role}`) }))
      onInvited?.()
    }
  }

  const toggleImportCandidate = (id) => {
    setSelectedImportIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedImportIds.size === importCandidates.length) {
      setSelectedImportIds(new Set())
    } else {
      setSelectedImportIds(new Set(importCandidates.map((m) => m.id)))
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface border border-line shadow-2xl p-6 space-y-5 animate-modal-enter"
      >
        {/* En-tête */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-tight text-fg">
              {t('network.inviteModalTitle')}
            </h3>
            {eventTitle && (
              <p className="text-xs sm:text-sm text-muted truncate mt-0.5">{eventTitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost btn-sm p-1.5 text-muted hover:text-fg shrink-0"
            aria-label={t('common.close')}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Onglets segmentés : Par e-mail | Depuis mon réseau */}
        <div
          role="tablist"
          className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-surface-2 border border-line"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'email'}
            onClick={() => {
              setTab('email')
              setError(null)
              setSuccess(null)
            }}
            className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              tab === 'email' ? 'bg-surface text-fg shadow-xs' : 'text-muted hover:text-fg'
            }`}
          >
            <EnvelopeSimpleIcon size={15} weight={tab === 'email' ? 'bold' : 'regular'} />
            <span>{t('network.tabByEmail')}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'network'}
            onClick={() => {
              setTab('network')
              setError(null)
              setSuccess(null)
            }}
            className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              tab === 'network' ? 'bg-surface text-fg shadow-xs' : 'text-muted hover:text-fg'
            }`}
          >
            <UsersThreeIcon size={15} weight={tab === 'network' ? 'bold' : 'regular'} />
            <span>{t('network.tabFromNetwork')}</span>
          </button>
        </div>

        {/* Sélecteur de rôle commun */}
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-muted">
            {t('researchers.inviteRoleLabel')}
          </span>
          <div
            role="radiogroup"
            aria-label={t('researchers.inviteRoleLabel')}
            className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-surface-2 border border-line"
          >
            {INVITE_ROLES.map((roleKey) => {
              const selected = role === roleKey
              return (
                <button
                  key={roleKey}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setRole(roleKey)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer truncate ${
                    selected ? 'bg-surface text-fg shadow-xs' : 'text-muted hover:text-fg'
                  }`}
                >
                  {t(`roles.${roleKey}`)}
                </button>
              )
            })}
          </div>
        </div>

        {error && <div className="alert-error text-xs">{error}</div>}
        {success && (
          <div className="rounded-xl bg-ok/10 border border-ok/25 text-ok px-3 py-2 text-xs font-medium flex items-center gap-2">
            <CheckIcon size={14} weight="bold" className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* ONGLET 1 : PAR E-MAIL */}
        {tab === 'email' ? (
          <form key="invite-tab-email" onSubmit={sendByEmail} className="space-y-4 animate-panel-enter">
            <div>
              <label htmlFor="unified-invite-email" className="form-label">
                {t('invitations.accountEmail')}
              </label>
              <input
                id="unified-invite-email"
                type="email"
                inputMode="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@univ-usto.dz"
                required
              />
              <p className="form-hint">{t('invitations.mustHaveAccount')}</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-ghost btn-sm text-xs">
                {t('common.close')}
              </button>
              <button type="submit" disabled={busy} className="btn-primary btn-sm text-xs inline-flex items-center gap-1.5">
                <UserPlusIcon size={14} weight="bold" />
                <span>{busy ? t('common.loading') : t('researchers.inviteConfirm')}</span>
              </button>
            </div>
          </form>
        ) : (
          /* ONGLET 2 : DEPUIS MON RÉSEAU / ANCIEN ÉVÉNEMENT */
          <div key="invite-tab-network" className="space-y-5 animate-panel-enter">
            {/* Recherche dans Mon réseau */}
            <div className="space-y-2.5">
              <div className="relative">
                <MagnifyingGlassIcon
                  size={15}
                  className="absolute start-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('network.searchNetworkPlaceholder')}
                  className="input-field ps-9 text-xs sm:text-sm"
                />
              </div>

              {filteredNetwork.length === 0 ? (
                <p className="text-xs text-muted p-4 rounded-xl border border-dashed border-line text-center">
                  {t('network.emptyNetwork')}
                </p>
              ) : (
                <ul className="divide-y divide-line/60 rounded-xl border border-line overflow-hidden max-h-52 overflow-y-auto bg-surface">
                  {filteredNetwork.map((m) => {
                    const isMember = existingSet.has(m.id)
                    const isJustInvited = invitedIds.has(m.id)
                    const label = m.full_name || m.email || t('researchers.defaultResearcher')
                    return (
                      <li key={m.id} className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={label} size={32} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs sm:text-sm font-medium text-fg truncate">
                                {label}
                              </span>
                              {m.isSaved && (
                                <BookmarkSimpleIcon
                                  size={12}
                                  weight="fill"
                                  className="text-accent-ink shrink-0"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                            <span className="block text-[11px] text-muted truncate">
                              {m.affiliation || m.email}
                            </span>
                          </div>
                        </div>
                        {isJustInvited ? (
                          <span className="text-xs font-medium text-ok shrink-0">
                            {t('researchers.invited')}
                          </span>
                        ) : isMember ? (
                          <span className="text-xs text-muted shrink-0">
                            {t('researchers.inviteAlreadyMember')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={invitingId === m.id}
                            onClick={() => inviteOne(m)}
                            className="btn-outline btn-sm text-xs shrink-0 cursor-pointer"
                          >
                            {invitingId === m.id ? t('common.loading') : t('researchers.invite')}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Raccourci : Importer depuis un événement passé */}
            {importableEvents.length > 0 && (
              <div className="pt-4 border-t border-line space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-fg">
                  <ClockCounterClockwiseIcon size={15} className="text-accent-ink shrink-0" weight="bold" />
                  <span>{t('network.importFromPastEvent')}</span>
                </div>

                <select
                  value={selectedPastEventId}
                  onChange={(e) => {
                    setSelectedPastEventId(e.target.value)
                    setSelectedImportIds(new Set())
                  }}
                  className="select-field text-xs"
                  aria-label={t('network.importFromPastEvent')}
                >
                  <option value="">{t('network.selectPastEvent')}</option>
                  {importableEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.members.length})
                    </option>
                  ))}
                </select>

                {selectedPastEventId && (
                  importCandidates.length === 0 ? (
                    <p className="text-xs text-muted italic">
                      {t('network.allAlreadyInvited')}
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="text-accent-ink hover:underline font-medium cursor-pointer"
                        >
                          {selectedImportIds.size === importCandidates.length
                            ? t('network.deselectAll')
                            : t('network.selectAll')}
                        </button>
                        <span className="text-muted">
                          {t('network.candidatesCount', { count: importCandidates.length })}
                        </span>
                      </div>

                      <ul className="divide-y divide-line/60 rounded-xl border border-line overflow-hidden max-h-44 overflow-y-auto bg-surface">
                        {importCandidates.map((m) => {
                          const checked = selectedImportIds.has(m.id)
                          const label = m.full_name || m.email || t('researchers.defaultResearcher')
                          return (
                            <li key={m.id}>
                              <label className="p-2.5 flex items-center gap-3 cursor-pointer hover:bg-surface-2/60 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleImportCandidate(m.id)}
                                  className="rounded border-line text-accent focus:ring-accent"
                                />
                                <div className="min-w-0 flex-1">
                                  <span className="block text-xs font-medium text-fg truncate">
                                    {label}
                                  </span>
                                  <span className="block text-[11px] text-muted truncate">
                                    {t(`roles.${m.role_in_event}`)}
                                    {m.affiliation ? ` · ${m.affiliation}` : ''}
                                  </span>
                                </div>
                              </label>
                            </li>
                          )
                        })}
                      </ul>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={busy || selectedImportIds.size === 0}
                          onClick={inviteSelectedFromPastEvent}
                          className="btn-primary btn-sm text-xs inline-flex items-center gap-1.5"
                        >
                          <UserPlusIcon size={14} weight="bold" />
                          <span>
                            {busy
                              ? t('common.loading')
                              : t('network.inviteSelected', { count: selectedImportIds.size })}
                          </span>
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
