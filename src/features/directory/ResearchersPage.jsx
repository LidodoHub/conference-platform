import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  MagnifyingGlassIcon,
  GraduationCapIcon,
  BuildingsIcon,
  EnvelopeSimpleIcon,
  CheckIcon,
  CopyIcon,
  ArrowLeftIcon,
  ArrowUpRightIcon,
  ArticleIcon,
  SparkleIcon,
  XIcon,
  ShieldCheckIcon,
  ArrowCounterClockwiseIcon,
  UserPlusIcon,
  BookmarkSimpleIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { useLanguage } from '../../context/LanguageContext'
import { useOrganizerNetwork } from '../../hooks/useOrganizerNetwork'
import { useUrlQueryState } from '../../hooks/useUrlQueryState'
import { useModalBehavior } from '../../hooks/useModalBehavior'
import Avatar from '../../components/ui/Avatar'
import { ROLE_LABELS } from '../../lib/constants'

// Facultés et pôles de recherche de l'USTO-MB
const FACULTY_IDS = ['all', 'info', 'elec', 'meca', 'chimie', 'archi']

const SUBMISSION_STATUS_KEYS = {
  accepted: 'researchers.peerValidated',
  submitted: 'researchers.statusSubmitted',
  rejected: 'researchers.statusRejected',
  revision_requested: 'researchers.statusRevisionRequested',
  pending: 'researchers.statusPending',
}

let cachedResearchers = null

export default function ResearchersPage({ onOpenEvent }) {
  const { user, isAdmin } = useAuth()
  const { t } = useLanguage()
  const { isSaved, toggleSave, isPastCollaborator, networkMembers } = useOrganizerNetwork()
  const [searchParams, setSearchParams] = useUrlQueryState()
  const activeTab = searchParams.get('view') === 'labs' ? 'labs' : 'researchers'
  const selectedLab = activeTab === 'labs' ? (searchParams.get('lab') || null) : null
  const networkOnly = searchParams.get('network') === '1'
  const profileId = searchParams.get('profile') || null
  const [researchers, setResearchers] = useState(cachedResearchers?.list || [])
  const [loading, setLoading] = useState(!cachedResearchers)
  const [search, setSearch] = useState('')
  const [selectedFaculty, setSelectedFaculty] = useState('all')
  const [selectedRole, setSelectedRole] = useState('all')

  const activeProfile = useMemo(
    () => (profileId ? researchers.find((r) => String(r.id) === String(profileId)) || null : null),
    [profileId, researchers],
  )

  const setActiveProfile = useCallback(
    (res) => {
      setSearchParams((prev) => {
        prev.set('page', 'researchers')
        if (res?.id) prev.set('profile', String(res.id))
        else prev.delete('profile')
        return prev
      })
    },
    [setSearchParams],
  )

  const selectTab = useCallback(
    (nextTab) => {
      setSearchParams((prev) => {
        prev.set('page', 'researchers')
        prev.set('view', nextTab)
        if (nextTab === 'labs') prev.delete('lab')
        return prev
      })
    },
    [setSearchParams],
  )

  const selectLab = useCallback(
    (labKey) => {
      setSearchParams((prev) => {
        prev.set('page', 'researchers')
        prev.set('view', 'labs')
        if (labKey) prev.set('lab', labKey)
        else prev.delete('lab')
        return prev
      })
    },
    [setSearchParams],
  )

  const toggleNetworkOnly = useCallback(() => {
    setSearchParams((prev) => {
      prev.set('page', 'researchers')
      if (prev.get('network') === '1') prev.delete('network')
      else prev.set('network', '1')
      return prev
    })
  }, [setSearchParams])

  const resetAllFilters = useCallback(() => {
    setSearch('')
    setSelectedFaculty('all')
    setSelectedRole('all')
    setSearchParams((prev) => {
      prev.set('page', 'researchers')
      prev.delete('lab')
      prev.delete('network')
      return prev
    })
  }, [setSearchParams])
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [managedEvents, setManagedEvents] = useState([])
  const [inviteTarget, setInviteTarget] = useState(null)
  const [invitingEventId, setInvitingEventId] = useState(null)
  const [invitedRoles, setInvitedRoles] = useState(() => ({}))
  const [inviteRole, setInviteRole] = useState('reviewer')
  const [inviteError, setInviteError] = useState(null)
  const [inviteSuccess, setInviteSuccess] = useState(null)

  const closeProfile = useCallback(() => setActiveProfile(null), [setActiveProfile])
  const closeInvite = useCallback(() => setInviteTarget(null), [])
  useModalBehavior(Boolean(activeProfile), closeProfile)
  useModalBehavior(Boolean(inviteTarget), closeInvite)

  const openInviteModal = (target) => {
    setInviteError(null)
    setInviteSuccess(null)
    setInviteRole('reviewer')
    setInviteTarget(target)
  }

  const loadData = useCallback(async () => {
    if (!cachedResearchers) setLoading(true)

    try {
      // 1. Récupération des profils enregistrés
      const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, affiliation, expertise, country')
        .order('full_name', { ascending: true })

      if (profErr) {
        setLoading(false)
        return
      }

      const profList = profs || []
      const profIds = profList.map((p) => p.id)

      // 2. Récupération croisée des participations et soumissions pour enrichir les métriques
      const [subsRes, partsRes] = await Promise.all([
        supabase
          .from('submissions')
          .select('id, title, status, author_id, event_id, events(id, title, start_date)')
          .in('author_id', profIds.length ? profIds : ['00000000-0000-0000-0000-000000000000']),
        supabase
          .from('event_participants')
          .select('id, user_id, role_in_event, event_id, events(id, title, start_date)')
          .in('user_id', profIds.length ? profIds : ['00000000-0000-0000-0000-000000000000']),
      ])

      const subsByUser = {}
      ;(subsRes.data || []).forEach((s) => {
        if (!subsByUser[s.author_id]) subsByUser[s.author_id] = []
        subsByUser[s.author_id].push(s)
      })

      const partsByUser = {}
      ;(partsRes.data || []).forEach((p) => {
        if (!partsByUser[p.user_id]) partsByUser[p.user_id] = []
        partsByUser[p.user_id].push(p)
      })

      // Déduction et enrichissement des données des chercheurs
      const enriched = profList.map((p) => {
        const userSubs = subsByUser[p.id] || []
        const userParts = partsByUser[p.id] || []
        const acceptedSubs = userSubs.filter((s) => s.status === 'accepted')

        // Détection de la faculté / labo basée sur l'affiliation ou l'expertise
        const affil = (p.affiliation || '').toLowerCase()
        const exp = (p.expertise || '').toLowerCase()
        let faculty = 'info'
        if (affil.includes('électr') || exp.includes('électr') || exp.includes('signal')) faculty = 'elec'
        else if (affil.includes('mécan') || exp.includes('mécan') || exp.includes('matériaux')) faculty = 'meca'
        else if (affil.includes('chim') || exp.includes('chim') || exp.includes('phys')) faculty = 'chimie'
        else if (affil.includes('civil') || affil.includes('archi') || exp.includes('archi')) faculty = 'archi'

        // Extraction des tags de recherche
        const tags = p.expertise
          ? p.expertise.split(',').map((t) => t.trim()).filter(Boolean)
          : []

        return {
          ...p,
          faculty,
          affiliation: p.affiliation || '',
          tags,
          submissions: userSubs,
          acceptedCount: acceptedSubs.length,
          eventsCount: userParts.length,
          participations: userParts,
        }
      })

      cachedResearchers = { list: enriched }
      setResearchers(enriched)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    const loadManaged = async () => {
      if (isAdmin) {
        const { data } = await supabase
          .from('events')
          .select('id, title, status, event_participants(user_id)')
          .in('status', ['published', 'ongoing'])
          .order('start_date', { ascending: false })
        if (!cancelled && data) {
          setManagedEvents(
            data.map((ev) => ({
              id: ev.id,
              title: ev.title,
              memberIds: new Set((ev.event_participants || []).map((p) => p.user_id)),
            })),
          )
        }
      } else {
        const { data } = await supabase
          .from('event_participants')
          .select('event_id, events(id, title, status, event_participants(user_id))')
          .eq('user_id', user.id)
          .eq('role_in_event', 'organizer')
        if (!cancelled && data) {
          setManagedEvents(
            data
              .filter((row) => row.events && ['published', 'ongoing'].includes(row.events.status))
              .map((row) => ({
                id: row.events.id,
                title: row.events.title,
                memberIds: new Set((row.events.event_participants || []).map((p) => p.user_id)),
              })),
          )
        }
      }
    }
    loadManaged()
    return () => {
      cancelled = true
    }
  }, [user?.id, isAdmin])

  const inviteMember = async (eventId, researcher) => {
    setInviteError(null)
    setInviteSuccess(null)
    setInvitingEventId(eventId)
    const { error: rpcError } = await supabase.rpc('invite_member', {
      p_event_id: eventId,
      p_role: inviteRole,
      p_user_id: researcher.id,
      p_email: researcher.email,
    })
    setInvitingEventId(null)
    if (rpcError) {
      setInviteError(rpcError.message || t('errors.saveRefused'))
      return
    }
    setInvitedRoles((prev) => ({ ...prev, [`${eventId}:${researcher.id}`]: inviteRole }))
    setInviteSuccess(t('researchers.inviteSuccess', { role: t(`roles.${inviteRole}`) }))
    setManagedEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId ? { ...ev, memberIds: new Set(ev.memberIds).add(researcher.id) } : ev,
      ),
    )
  }

  const copyEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    } catch {
      // ignore
    }
  }

  const relevantResearchers = useMemo(() => {
    return researchers.filter(
      (r) =>
        ['organizer', 'reviewer', 'admin'].includes(r.role) ||
        r.acceptedCount > 0 ||
        r.tags.length > 0,
    )
  }, [researchers])

  const labs = useMemo(() => {
    const map = new Map()
    relevantResearchers.forEach((r) => {
      const raw = (r.affiliation || '').trim()
      const key = raw ? raw.toLowerCase().replace(/\s+/g, ' ') : '__independent__'
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: raw || null,
          members: [],
          totalPapers: 0,
          tagCounts: new Map(),
        })
      }
      const entry = map.get(key)
      entry.members.push(r)
      entry.totalPapers += r.acceptedCount
      r.tags.forEach((tag) => {
        entry.tagCounts.set(tag, (entry.tagCounts.get(tag) || 0) + 1)
      })
    })
    return Array.from(map.values())
      .map((lab) => ({
        ...lab,
        topTags: Array.from(lab.tagCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([tag]) => tag),
      }))
      .sort((a, b) => b.members.length - a.members.length)
  }, [relevantResearchers])

  const filteredLabs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return labs
    return labs.filter((lab) => {
      const displayName = (lab.name || t('researchers.independentLab')).toLowerCase()
      return displayName.includes(q) || lab.topTags.some((tag) => tag.toLowerCase().includes(q))
    })
  }, [labs, search, t])

  const filteredResearchers = useMemo(() => {
    return relevantResearchers.filter((r) => {
      const q = search.trim().toLowerCase()
      const haystack = `${r.full_name || ''} ${r.email || ''} ${r.affiliation || ''} ${r.expertise || ''} ${r.tags.join(' ')}`.toLowerCase()

      if (q && !haystack.includes(q)) return false
      if (networkOnly && !isSaved(r.id) && !isPastCollaborator(r.id)) return false
      if (selectedFaculty !== 'all' && r.faculty !== selectedFaculty) return false
      if (selectedRole !== 'all' && r.role !== selectedRole) return false
      return true
    })
  }, [relevantResearchers, search, networkOnly, isSaved, isPastCollaborator, selectedFaculty, selectedRole])

  const activeLabObj = useMemo(
    () => (selectedLab ? labs.find((l) => l.key === selectedLab) : null),
    [selectedLab, labs],
  )

  const renderResearcherCard = (res) => {
    const displayName = res.full_name || res.email?.split('@')[0] || t('researchers.defaultResearcher')
    const roleKey = `roles.${res.role}`
    const translatedRole = t(roleKey)
    const roleBadge = translatedRole !== roleKey ? translatedRole : (ROLE_LABELS[res.role] || t('researchers.defaultRole'))
    const canInvite = managedEvents.length > 0 && res.id !== user?.id
    const saved = isSaved(res.id)
    const collaborated = isPastCollaborator(res.id)

    return (
      <article
        key={res.id}
        className="card border border-line bg-surface hover:border-neutral-300 dark:hover:border-white/20 shadow-card hover:shadow-lift transition-[transform,border-color,box-shadow] duration-200 flex flex-col justify-between p-5 space-y-4"
      >
        {/* Haut de carte */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={displayName} size={44} tone="brand" />
              <div className="min-w-0">
                <h2 className="font-semibold text-fg text-sm sm:text-base leading-snug truncate">
                  {displayName}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-100/80 text-neutral-700 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
                    <span>{roleBadge}</span>
                  </span>
                  {collaborated && (
                    <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-100/80 text-neutral-600 border border-neutral-200/80 dark:bg-white/[0.05] dark:text-neutral-300 dark:border-white/10">
                      {t('network.pastCollaborator')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {res.id !== user?.id && (
              <button
                type="button"
                onClick={() => toggleSave(res.id)}
                aria-pressed={saved}
                aria-label={saved ? t('network.removeFromNetwork') : t('network.addToNetwork')}
                title={saved ? t('network.removeFromNetwork') : t('network.addToNetwork')}
                className={`p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
                  saved
                    ? 'text-accent-ink hover:bg-neutral-100 dark:hover:bg-white/[0.06]'
                    : 'text-muted hover:text-fg hover:bg-neutral-100 dark:hover:bg-white/[0.06]'
                }`}
              >
                <BookmarkSimpleIcon size={16} weight={saved ? 'fill' : 'regular'} />
              </button>
            )}
          </div>

          {/* Affiliation / Laboratoire */}
          {res.affiliation && (
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <BuildingsIcon size={14} className="text-muted shrink-0" />
              <span className="truncate">{res.affiliation}</span>
            </div>
          )}

          {/* Tags d'expertise en pilules neutres */}
          {res.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {res.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-100/80 text-neutral-700 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10"
                >
                  {tag}
                </span>
              ))}
              {res.tags.length > 3 && (
                <span dir="ltr" className="text-[11px] text-muted self-center font-mono">
                  +{res.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bas de carte : stats (> 0 uniquement) & actions */}
        <div className="pt-3 border-t border-line/60 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted min-w-0">
            {res.acceptedCount > 0 && (
              <span>
                <strong className="text-fg font-mono">{res.acceptedCount}</strong>{' '}
                {t(res.acceptedCount > 1 ? 'researchers.articlePlural' : 'researchers.articleSingle')}
              </span>
            )}
            {res.acceptedCount > 0 && res.eventsCount > 0 && (
              <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">·</span>
            )}
            {res.eventsCount > 0 && (
              <span>
                <strong className="text-fg font-mono">{res.eventsCount}</strong>{' '}
                {t(res.eventsCount > 1 ? 'researchers.eventPlural' : 'researchers.eventSingle')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 ms-auto">
            {canInvite && (
              <button
                type="button"
                onClick={() => openInviteModal(res)}
                className="btn-ghost btn-sm text-xs font-medium inline-flex items-center gap-1 text-accent-ink hover:bg-neutral-100 dark:hover:bg-white/[0.06]"
                title={t('researchers.invite')}
              >
                <UserPlusIcon size={13} weight="bold" />
                <span className="hidden sm:inline">{t('researchers.invite')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveProfile(res)}
              className="btn-outline btn-sm text-xs font-medium inline-flex items-center gap-1"
            >
              <span>{t('researchers.profileBtn')}</span>
              <ArrowUpRightIcon size={12} weight="bold" className="rtl:rotate-180" />
            </button>
          </div>
        </div>
      </article>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-8 pb-16 space-y-8 animate-page-enter">
      {/* EN-TÊTE COMPACT */}
      <header className="space-y-3 max-w-4xl">
        <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.025em] text-fg leading-tight">
          {t('researchers.title')}
        </h1>
        <p className="text-sm sm:text-base text-muted leading-relaxed max-w-[70ch]">
          {t('researchers.description')}
        </p>

        {/* Bandeau de métadonnées inline sobre */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-[13px] text-muted pt-1">
          <span className="font-medium text-fg">{t('researchers.metaResearchers', { count: relevantResearchers.length })}</span>
          <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">·</span>
          <span className="font-medium text-fg">{t('researchers.metaLabs', { count: labs.length })}</span>
          <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">·</span>
          <span>{t('researchers.metaCommittees')}</span>
        </div>
      </header>

      {/* SÉLECTEUR SEGMENTÉ : CHERCHEURS | LABORATOIRES */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex items-center bg-surface-2 p-1 rounded-xl border border-line gap-1 max-w-full overflow-x-auto">
          <button
            type="button"
            onClick={() => selectTab('researchers')}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              activeTab === 'researchers'
                ? 'bg-surface text-fg shadow-xs'
                : 'text-muted hover:text-fg'
            }`}
          >
            <GraduationCapIcon size={15} weight={activeTab === 'researchers' ? 'bold' : 'regular'} />
            <span>{t('researchers.tabResearchers')}</span>
          </button>
          <button
            type="button"
            onClick={() => selectTab('labs')}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              activeTab === 'labs'
                ? 'bg-surface text-fg shadow-xs'
                : 'text-muted hover:text-fg'
            }`}
          >
            <BuildingsIcon size={15} weight={activeTab === 'labs' ? 'bold' : 'regular'} />
            <span>{t('researchers.tabLabs')}</span>
          </button>
        </div>

        {activeTab === 'researchers' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={toggleNetworkOnly}
              aria-pressed={networkOnly}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                networkOnly
                  ? 'bg-surface text-accent-ink border-accent/40 shadow-xs'
                  : 'bg-surface-2 text-muted border-line hover:text-fg'
              }`}
            >
              <BookmarkSimpleIcon size={14} weight={networkOnly ? 'fill' : 'regular'} className={networkOnly ? 'text-accent-ink' : ''} />
              <span>{t('network.myNetwork')}</span>
              {networkMembers.length > 0 && (
                <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-full bg-black/[0.06] dark:bg-white/[0.08] text-fg">
                  {networkMembers.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* RECHERCHE ET FILTRES (masqué dans la fiche détail d'un laboratoire) */}
      {!(activeTab === 'labs' && activeLabObj) && (
      <section className="card p-4 sm:p-5 border-line bg-surface-2/60 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-center">
          {/* Champ recherche */}
          <div className="relative">
            <MagnifyingGlassIcon
              size={18}
              className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('researchers.searchPlaceholder')}
              className="input-field ps-10 text-sm"
            />
          </div>

          {/* Filtre par statut / rôle */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="select-field text-xs h-10 w-full md:w-auto"
            aria-label={t('researchers.filterByRoleAria')}
          >
            <option value="all">{t('researchers.rolesAll')}</option>
            <option value="organizer">{t('researchers.rolesOrganizer')}</option>
            <option value="reviewer">{t('researchers.rolesReviewer')}</option>
            <option value="participant">{t('researchers.rolesParticipant')}</option>
          </select>

          {/* Filtre par Faculté */}
          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
            className="select-field text-xs h-10 w-full md:w-auto font-medium"
            aria-label={t('researchers.filterByFacultyAria')}
          >
            {FACULTY_IDS.map((facultyId) => (
              <option key={facultyId} value={facultyId}>
                {t(`researchers.faculties.${facultyId}`)}
              </option>
            ))}
          </select>
        </div>

        {(search || networkOnly || selectedFaculty !== 'all' || selectedRole !== 'all') && (
          <div className="flex items-center justify-between text-xs text-muted pt-1 border-t border-line/60">
            <span>
              {activeTab === 'researchers'
                ? t(
                    filteredResearchers.length > 1
                      ? 'researchers.matchCountPlural'
                      : 'researchers.matchCountSingle',
                    { count: filteredResearchers.length },
                  )
                : t('researchers.metaLabs', { count: filteredLabs.length })}
            </span>
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-accent-ink hover:underline inline-flex items-center gap-1 font-semibold"
            >
              <ArrowCounterClockwiseIcon size={12} weight="bold" />
              {t('researchers.resetFilters')}
            </button>
          </div>
        )}
      </section>
      )}

      {/* VUE 1 : CHERCHEURS */}
      {activeTab === 'researchers' ? (
        <div key="tab-researchers" className="animate-panel-enter">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="skeleton h-56 rounded-2xl" />
              <div className="skeleton h-56 rounded-2xl" />
              <div className="skeleton h-56 rounded-2xl" />
            </div>
          ) : filteredResearchers.length === 0 ? (
            <div className="card p-12 text-center border-dashed space-y-3">
              <GraduationCapIcon size={36} className="text-muted mx-auto" weight="thin" />
              <h3 className="text-base font-semibold text-fg">{t('researchers.emptyTitle')}</h3>
              <p className="text-xs sm:text-sm text-muted max-w-[50ch] mx-auto">
                {t('researchers.emptyBody')}
              </p>
              {(search || networkOnly || selectedFaculty !== 'all' || selectedRole !== 'all') && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="btn-outline btn-sm inline-flex items-center gap-1.5 mx-auto mt-2"
                >
                  <ArrowCounterClockwiseIcon size={14} weight="bold" />
                  {t('researchers.clearSearch')}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredResearchers.map(renderResearcherCard)}
            </div>
          )}
        </div>
      ) : activeLabObj ? (
        /* VUE 2B : FICHE DÉTAIL INLINE DU LABORATOIRE */
        <div key={`lab-${activeLabObj.key}`} className="space-y-6 animate-panel-enter">
          <button
            type="button"
            onClick={() => selectLab(null)}
            className="btn-ghost btn-sm -ms-2 text-muted hover:text-fg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeftIcon size={15} weight="bold" className="rtl:rotate-180" aria-hidden="true" />
            <span>{t('researchers.backToLabs')}</span>
          </button>

          <header className="card p-6 border border-line bg-surface space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-neutral-100 text-neutral-700 dark:bg-white/[0.06] dark:text-neutral-200 flex items-center justify-center shrink-0">
                <BuildingsIcon size={22} weight="regular" />
              </div>
              <div className="min-w-0 space-y-1.5">
                <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-fg leading-snug">
                  {activeLabObj.name || t('researchers.independentLab')}
                </h2>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-[13px] text-muted">
                  <span className="font-medium text-fg">
                    {t(
                      activeLabObj.members.length > 1
                        ? 'researchers.labMembersPlural'
                        : 'researchers.labMembersSingle',
                      { count: activeLabObj.members.length },
                    )}
                  </span>
                  {activeLabObj.totalPapers > 0 && (
                    <>
                      <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">·</span>
                      <span>
                        {t(
                          activeLabObj.totalPapers > 1
                            ? 'researchers.labPapersPlural'
                            : 'researchers.labPapersSingle',
                          { count: activeLabObj.totalPapers },
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {activeLabObj.topTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeLabObj.topTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-neutral-100/80 text-neutral-700 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeLabObj.members.map(renderResearcherCard)}
          </div>
        </div>
      ) : (
        /* VUE 2 : LABORATOIRES */
        <div key="tab-labs" className="animate-panel-enter">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="skeleton h-44 rounded-2xl" />
              <div className="skeleton h-44 rounded-2xl" />
              <div className="skeleton h-44 rounded-2xl" />
            </div>
          ) : filteredLabs.length === 0 ? (
            <div className="card p-12 text-center border-dashed space-y-3">
              <BuildingsIcon size={36} className="text-muted mx-auto" weight="thin" />
              <h3 className="text-base font-semibold text-fg">{t('researchers.noLabsTitle')}</h3>
              <p className="text-xs sm:text-sm text-muted max-w-[50ch] mx-auto">
                {t('researchers.noLabsBody')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredLabs.map((lab) => {
                const labName = lab.name || t('researchers.independentLab')
                return (
                  <button
                    key={lab.key}
                    type="button"
                    onClick={() => selectLab(lab.key)}
                    className="group text-start card border border-line bg-surface hover:border-neutral-300 dark:hover:border-white/20 shadow-card hover:shadow-lift transition-[transform,border-color,box-shadow] duration-200 flex flex-col justify-between p-5 space-y-4 cursor-pointer"
                  >
                    <div className="space-y-3 w-full">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-700 dark:bg-white/[0.06] dark:text-neutral-200 flex items-center justify-center shrink-0">
                          <BuildingsIcon size={18} weight="regular" />
                        </div>
                        <ArrowUpRightIcon
                          size={15}
                          weight="bold"
                          className="text-muted group-hover:text-fg transition-colors rtl:rotate-180 shrink-0"
                        />
                      </div>

                      <h2 className="font-semibold text-fg text-sm sm:text-base leading-snug line-clamp-2">
                        {labName}
                      </h2>

                      {lab.topTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {lab.topTags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-100/80 text-neutral-700 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-line/60 w-full flex items-center justify-between gap-2 text-xs text-muted">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-fg">
                          {t(lab.members.length > 1 ? 'researchers.labMembersPlural' : 'researchers.labMembersSingle', {
                            count: lab.members.length,
                          })}
                        </span>
                        {lab.totalPapers > 0 && (
                          <>
                            <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">·</span>
                            <span>
                              {t(lab.totalPapers > 1 ? 'researchers.labPapersPlural' : 'researchers.labPapersSingle', {
                                count: lab.totalPapers,
                              })}
                            </span>
                          </>
                        )}
                      </div>
                      <span className="text-accent-ink font-medium">{t('researchers.viewMembers')}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* MODALE / VOLET DU DOSSIER ACADÉMIQUE DU CHERCHEUR */}
      {activeProfile && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in"
        >
          <div className="bg-surface border border-line rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 animate-modal-enter">
            {/* Header du profil */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-line">
              <div className="flex items-center gap-4">
                <Avatar name={activeProfile.full_name || activeProfile.email} size={56} tone="brand" />
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-fg">
                    {activeProfile.full_name || activeProfile.email}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-neutral-100/80 text-neutral-700 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
                      <span>
                        {t(`roles.${activeProfile.role}`) !== `roles.${activeProfile.role}`
                          ? t(`roles.${activeProfile.role}`)
                          : (ROLE_LABELS[activeProfile.role] || t('researchers.defaultResearcher'))}
                      </span>
                    </span>
                    <span className="text-xs text-muted flex items-center gap-1">
                      <BuildingsIcon size={13} />
                      {activeProfile.affiliation || t('researchers.defaultAffiliation')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {activeProfile.id !== user?.id && (
                  <button
                    type="button"
                    onClick={() => toggleSave(activeProfile.id)}
                    aria-pressed={isSaved(activeProfile.id)}
                    aria-label={isSaved(activeProfile.id) ? t('network.removeFromNetwork') : t('network.addToNetwork')}
                    title={isSaved(activeProfile.id) ? t('network.removeFromNetwork') : t('network.addToNetwork')}
                    className={`btn-ghost btn-sm p-1.5 ${
                      isSaved(activeProfile.id) ? 'text-accent-ink' : 'text-muted hover:text-fg'
                    }`}
                  >
                    <BookmarkSimpleIcon size={19} weight={isSaved(activeProfile.id) ? 'fill' : 'regular'} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveProfile(null)}
                  className="btn-ghost btn-sm text-muted hover:text-fg p-1.5"
                  aria-label={t('common.close')}
                >
                  <XIcon size={20} />
                </button>
              </div>
            </div>

            {/* Contact & Identifiants universitaires */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-2 border border-line space-y-1">
                <span className="text-muted font-medium flex items-center gap-1.5">
                  <EnvelopeSimpleIcon size={13} className="text-accent-ink" />
                  {t('researchers.institutionalEmail')}
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-fg truncate">{activeProfile.email}</span>
                  <button
                    type="button"
                    onClick={() => copyEmail(activeProfile.email)}
                    className="text-accent-ink hover:underline inline-flex items-center gap-1 shrink-0 font-semibold"
                  >
                    {copiedEmail ? <CheckIcon size={12} weight="bold" /> : <CopyIcon size={12} />}
                    <span>{copiedEmail ? t('researchers.copied') : t('researchers.copy')}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-2 border border-line space-y-1">
                <span className="text-muted font-medium block">{t('researchers.accreditationStatus')}</span>
                <div className="flex items-center gap-1.5 text-ok font-semibold">
                  <ShieldCheckIcon size={16} weight="bold" />
                  <span>{t('researchers.verifiedAccount')}</span>
                </div>
              </div>
            </div>

            {/* Domaines d'expertise */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <SparkleIcon size={14} className="text-accent-ink" weight="bold" />
                {t('researchers.expertiseHeading')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {activeProfile.tags.length > 0 ? (
                  activeProfile.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs font-medium px-2.5 py-1 rounded-lg bg-surface-sunken border border-line text-fg"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted italic">{t('researchers.noExpertise')}</span>
                )}
              </div>
            </div>

            {/* Communications & Articles présentés */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <ArticleIcon size={14} className="text-accent-ink" weight="bold" />
                {t('researchers.submissionsHeading', { count: activeProfile.submissions.length })}
              </h4>

              {activeProfile.submissions.length === 0 ? (
                <p className="text-xs text-muted italic p-3 rounded-xl bg-surface-2 border border-line">
                  {t('researchers.noSubmissions')}
                </p>
              ) : (
                <ul className="divide-y divide-line rounded-xl border border-line bg-surface overflow-hidden">
                  {activeProfile.submissions.map((sub) => (
                    <li key={sub.id} className="p-3.5 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          sub.status === 'accepted' ? 'bg-ok/15 text-ok' : 'bg-fg/10 text-muted'
                        }`}>
                          {SUBMISSION_STATUS_KEYS[sub.status]
                            ? t(SUBMISSION_STATUS_KEYS[sub.status])
                            : sub.status}
                        </span>
                        {sub.events?.title && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveProfile(null)
                              onOpenEvent(sub.event_id)
                            }}
                            className="text-accent-ink hover:underline text-[11px] inline-flex items-center gap-1 font-semibold"
                          >
                            <span className="truncate max-w-[200px]">{sub.events.title}</span>
                            <ArrowUpRightIcon size={11} weight="bold" className="rtl:rotate-180" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-fg leading-snug">{sub.title}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Bouton de fermeture */}
            <div className="pt-2 flex justify-end gap-2">
              {managedEvents.length > 0 && activeProfile.id !== user?.id && (
                <button
                  type="button"
                  onClick={() => openInviteModal(activeProfile)}
                  className="btn-outline btn-sm text-xs font-medium inline-flex items-center gap-1.5"
                >
                  <UserPlusIcon size={14} weight="bold" />
                  <span>{t('researchers.invite')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveProfile(null)}
                className="btn-primary btn-sm text-xs font-semibold"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE INVITER COMME REVIEWER */}
      {inviteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setInviteTarget(null)}
          className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-white/10 shadow-2xl p-6 space-y-4 animate-modal-enter"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[17px] font-semibold tracking-tight text-neutral-900 dark:text-white">
                  {t('researchers.inviteModalTitle')}
                </h3>
                <p className="text-[13.5px] text-neutral-500 dark:text-neutral-400 mt-1">
                  {t('researchers.inviteModalDesc', {
                    name: inviteTarget.full_name || inviteTarget.email || t('researchers.defaultResearcher'),
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInviteTarget(null)}
                className="btn-ghost btn-sm p-1 text-muted hover:text-fg"
                aria-label={t('common.close')}
              >
                <XIcon size={18} />
              </button>
            </div>

            {/* Sélecteur de rôle */}
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                {t('researchers.inviteRoleLabel')}
              </span>
              <div
                role="radiogroup"
                aria-label={t('researchers.inviteRoleLabel')}
                className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-neutral-100/80 dark:bg-white/[0.04] border border-neutral-200/70 dark:border-white/[0.08]"
              >
                {['reviewer', 'organizer', 'participant'].map((roleKey) => {
                  const selected = inviteRole === roleKey
                  return (
                    <button
                      key={roleKey}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setInviteRole(roleKey)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer truncate ${
                        selected
                          ? 'bg-white dark:bg-white/[0.10] text-neutral-900 dark:text-white shadow-xs'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {t(`roles.${roleKey}`)}
                    </button>
                  )
                })}
              </div>
            </div>

            {inviteError && <div className="alert-error text-xs">{inviteError}</div>}
            {inviteSuccess && (
              <div className="rounded-xl bg-ok/10 border border-ok/25 text-ok px-3 py-2 text-xs font-medium">
                {inviteSuccess}
              </div>
            )}

            <ul className="divide-y divide-line/60 rounded-xl border border-line overflow-hidden max-h-64 overflow-y-auto">
              {managedEvents.map((ev) => {
                const isMember = ev.memberIds.has(inviteTarget.id)
                const invitedRole = invitedRoles[`${ev.id}:${inviteTarget.id}`]
                return (
                  <li key={ev.id} className="p-3.5 flex items-center justify-between gap-3 bg-surface">
                    <span className="text-xs sm:text-sm font-medium text-fg truncate">{ev.title}</span>
                    {invitedRole ? (
                      <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 shrink-0">
                        {t('researchers.invitedAsRole', { role: t(`roles.${invitedRole}`) })}
                      </span>
                    ) : isMember ? (
                      <span className="text-xs text-muted shrink-0">
                        {t('researchers.inviteAlreadyMember')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={invitingEventId === ev.id}
                        onClick={() => inviteMember(ev.id, inviteTarget)}
                        className="btn-outline btn-sm text-xs font-medium shrink-0 cursor-pointer"
                      >
                        {invitingEventId === ev.id ? t('common.loading') : t('researchers.inviteConfirm')}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
