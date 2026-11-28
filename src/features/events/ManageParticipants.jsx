import { useState } from 'react'
import {
  MagnifyingGlassIcon,
  UserMinusIcon,
  UsersThreeIcon,
  SquaresFourIcon,
  TableIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { writeError } from '../../lib/errors'
import { useConfirm } from '../../context/ConfirmContext'
import { useLanguage } from '../../context/LanguageContext'
import { ROLE_COLOR } from '../../lib/constants'
import Avatar from '../../components/ui/Avatar'
import Tabs from '../../components/ui/Tabs'
import SectionTitle from '../../components/ui/SectionTitle'
import EmptyState from '../../components/ui/EmptyState'

const ROLES = ['organizer', 'reviewer', 'participant']

export default function ManageParticipants({ participants, onUpdated }) {
  const confirm = useConfirm()
  const { t } = useLanguage()
  const myId = useAuth().user?.id ?? null
  const [updatingId, setUpdatingId] = useState(null)
  const [error, setError] = useState(null)
  const [role, setRole] = useState('all')
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState('table') // 'table' | 'cards'

  const handleRoleChange = async (p, newRole) => {
    if (newRole === 'organizer') {
      const ok = await confirm({
        title: t('participants.promoteTitle', { name: p.profiles?.full_name }),
        description: t('participants.promoteDesc'),
        confirmLabel: t('participants.promoteConfirm'),
        variant: 'default',
      })
      if (!ok) return
    }
    setUpdatingId(p.id)
    setError(null)
    const res = await supabase.from('event_participants').update({ role_in_event: newRole }).eq('id', p.id).select('id')
    setUpdatingId(null)
    const msg = writeError(res, t('errors.saveRefused'))
    if (msg) setError(msg)
    else onUpdated()
  }

  const handleRemove = async (p) => {
    const ok = await confirm({
      title: t('participants.removeTitle', { name: p.profiles?.full_name || t('participants.thisParticipant') }),
      description: t('participants.removeDesc'),
      confirmLabel: t('participants.removeConfirm'),
      variant: 'danger',
    })
    if (!ok) return
    setUpdatingId(p.id)
    setError(null)
    const res = await supabase.from('event_participants').delete().eq('id', p.id).select('id')
    setUpdatingId(null)
    const msg = writeError(res, t('errors.deleteRefused'))
    if (msg) setError(msg)
    else onUpdated()
  }

  const countOf = (r) => participants.filter((p) => p.role_in_event === r).length
  const q = query.trim().toLowerCase()
  const listed = participants
    .filter((p) => role === 'all' || p.role_in_event === role)
    .filter((p) => !q || [p.profiles?.full_name, p.profiles?.email].some((v) => (v || '').toLowerCase().includes(q)))
    .sort(
      (a, b) =>
        ROLES.indexOf(a.role_in_event) - ROLES.indexOf(b.role_in_event) ||
        (a.profiles?.full_name || '').localeCompare(b.profiles?.full_name || ''),
    )

  return (
    <section className="space-y-6">
      <SectionTitle
        title={t('event.members')}
        count={participants.length}
        description={t('participants.description')}
      />

      {/* Barre d'outils : Filtres rôles + Recherche + Commutateur de vue */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <Tabs
          variant="pill"
          wrap
          label={t('participants.filterByRole')}
          active={role}
          onChange={setRole}
          tabs={[
            { id: 'all', label: t('common.all') },
            ...ROLES.map((r) => ({ id: r, label: t(`roles.${r}`), badge: countOf(r) || null })),
          ]}
        />

        <div className="flex items-center gap-2.5">
          <label className="relative flex-1 sm:w-64">
            <span className="sr-only">{t('common.search')}</span>
            <MagnifyingGlassIcon
              size={15}
              className="absolute start-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              className="input-field ps-9.5 text-xs sm:text-sm py-1.5"
              placeholder={t('participants.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          {/* Commutateur de vue : Tableau vs Cartes */}
          <div className="flex items-center rounded-xl border border-line bg-surface/80 p-0.5 shrink-0" aria-label={t('participants.displayMode')}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-surface text-fg shadow-xs ring-1 ring-line' : 'text-muted hover:text-fg'
              }`}
              title={t('participants.tableView')}
              aria-label={t('participants.tableView')}
            >
              <TableIcon size={17} weight={viewMode === 'table' ? 'fill' : 'regular'} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'cards' ? 'bg-surface text-fg shadow-xs ring-1 ring-line' : 'text-muted hover:text-fg'
              }`}
              title={t('participants.cardView')}
              aria-label={t('participants.cardViewAria')}
            >
              <SquaresFourIcon size={17} weight={viewMode === 'cards' ? 'fill' : 'regular'} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="alert-error">
          {error}
        </div>
      )}

      {listed.length === 0 ? (
        <EmptyState
          compact
          icon={UsersThreeIcon}
          title={t('participants.emptyTitle')}
          body={t('participants.emptyBody')}
        />
      ) : viewMode === 'table' ? (
        /* --- 1. VUE TABLEAU PLEINE LARGEUR (DATA TABLE SAAS) --- */
        <div className="card overflow-hidden border-line rise">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs sm:text-sm">
              <thead className="bg-surface border-b border-line text-faint text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th scope="col" className="px-4 py-3">{t('participants.colMember')}</th>
                  <th scope="col" className="px-4 py-3">{t('participants.colEmail')}</th>
                  <th scope="col" className="px-4 py-3">{t('participants.colRole')}</th>
                  <th scope="col" className="px-4 py-3 text-end">{t('participants.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {listed.map((p) => {
                  const isMe = p.user_id === myId
                  const color = ROLE_COLOR[p.role_in_event]
                  return (
                    <tr key={p.id} className="hover:bg-fg/4 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar name={p.profiles?.full_name} size={32} />
                          <div>
                            <span className="font-semibold text-fg">
                              {p.profiles?.full_name || t('profile.unnamed')}
                            </span>
                            {isMe && <span className="text-accent-ink text-xs font-normal"> ({t('participants.you')})</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-muted">
                        {p.profiles?.email || '—'}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                          <select
                            id={`role-${p.id}`}
                            value={p.role_in_event}
                            onChange={(e) => handleRoleChange(p, e.target.value)}
                            disabled={updatingId === p.id || isMe}
                            aria-label={`${t('roles.' + p.role_in_event)} ${p.profiles?.full_name}`}
                            className="select-field w-auto py-1 text-xs"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {t(`roles.${r}`)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-end">
                        {!isMe && (
                          <button
                            type="button"
                            className="icon-btn w-8 h-8 text-faint hover:text-bad inline-flex items-center justify-center"
                            disabled={updatingId === p.id}
                            onClick={() => handleRemove(p)}
                            aria-label={`${t('participants.removeConfirm')} ${p.profiles?.full_name}`}
                            title={t('participants.removeFromEvent')}
                          >
                            <UserMinusIcon size={16} />
                          </button>
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
        /* --- 2. VUE CARTES HORIZONTALES --- */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 rise">
          {listed.map((p) => {
            const isMe = p.user_id === myId
            const color = ROLE_COLOR[p.role_in_event]
            return (
              <div
                key={p.id}
                className="card p-4 border-line bg-surface/70 flex flex-col justify-between gap-3 relative overflow-hidden"
              >
                <span
                  className="absolute start-0 top-0 bottom-0 w-1"
                  style={{ background: color }}
                  aria-hidden="true"
                />

                <div className="flex items-start gap-3 min-w-0">
                  <Avatar name={p.profiles?.full_name} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg truncate">
                      {p.profiles?.full_name || t('profile.unnamed')}
                      {isMe && <span className="text-accent-ink text-xs font-normal"> ({t('participants.you')})</span>}
                    </p>
                    <p className="text-xs text-muted truncate mt-0.5">{p.profiles?.email}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-line flex items-center justify-between gap-2">
                  <select
                    id={`card-role-${p.id}`}
                    value={p.role_in_event}
                    onChange={(e) => handleRoleChange(p, e.target.value)}
                    disabled={updatingId === p.id || isMe}
                    aria-label={`${t('roles.' + p.role_in_event)} ${p.profiles?.full_name}`}
                    className="select-field w-auto py-1 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {t(`roles.${r}`)}
                      </option>
                    ))}
                  </select>

                  {!isMe && (
                    <button
                      type="button"
                      className="icon-btn w-8 h-8 text-faint hover:text-bad"
                      disabled={updatingId === p.id}
                      onClick={() => handleRemove(p)}
                      aria-label={`${t('participants.removeConfirm')} ${p.profiles?.full_name}`}
                      title={t('participants.removeFromEvent')}
                    >
                      <UserMinusIcon size={16} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
