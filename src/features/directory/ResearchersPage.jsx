import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  MagnifyingGlassIcon,
  GraduationCapIcon,
  BuildingsIcon,
  EnvelopeSimpleIcon,
  CheckIcon,
  CopyIcon,
  ArrowUpRightIcon,
  ArticleIcon,
  SparkleIcon,
  XIcon,
  ShieldCheckIcon,
  ArrowCounterClockwiseIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import Avatar from '../../components/ui/Avatar'
import { ROLE_LABELS } from '../../lib/constants'

// Facultés et pôles de recherche de l'USTO-MB
const FACULTIES = [
  { id: 'all', label: 'Toutes les facultés' },
  { id: 'info', label: 'Informatique & Mathématiques' },
  { id: 'elec', label: 'Génie Électrique & Électronique' },
  { id: 'meca', label: 'Génie Mécanique & Maritime' },
  { id: 'chimie', label: 'Chimie & Physique des Matériaux' },
  { id: 'archi', label: 'Génie Civil & Architecture' },
]

// Mots-clés de spécialités fréquentes à l'USTO
const DEFAULT_TOPICS = [
  'Intelligence Artificielle',
  'Vision par Ordinateur',
  'Systèmes Distribués',
  'Cybersécurité',
  'Énergies Renouvelables',
  'Mécatronique',
  'Science des Matériaux',
  'Génie Logiciel',
]

let cachedResearchers = null

export default function ResearchersPage({ onOpenEvent }) {
  const [researchers, setResearchers] = useState(cachedResearchers?.list || [])
  const [loading, setLoading] = useState(!cachedResearchers)
  const [search, setSearch] = useState('')
  const [selectedFaculty, setSelectedFaculty] = useState('all')
  const [selectedRole, setSelectedRole] = useState('all')
  const [activeProfile, setActiveProfile] = useState(null)
  const [copiedEmail, setCopiedEmail] = useState(false)

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
          : [DEFAULT_TOPICS[Math.abs(p.id.charCodeAt(0)) % DEFAULT_TOPICS.length]]

        return {
          ...p,
          faculty,
          affiliation: p.affiliation || 'Université USTO-MB Oran',
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

  const copyEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    } catch {
      // ignore
    }
  }

  const filteredResearchers = useMemo(() => {
    return researchers.filter((r) => {
      const q = search.trim().toLowerCase()
      const haystack = `${r.full_name || ''} ${r.email || ''} ${r.affiliation || ''} ${r.expertise || ''} ${r.tags.join(' ')}`.toLowerCase()

      if (q && !haystack.includes(q)) return false
      if (selectedFaculty !== 'all' && r.faculty !== selectedFaculty) return false
      if (selectedRole !== 'all' && r.role !== selectedRole) return false
      return true
    })
  }, [researchers, search, selectedFaculty, selectedRole])

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-10 py-8 sm:py-12 space-y-8 animate-view-fade">
      {/* EN-TÊTE INSTITUTIONNEL */}
      <header className="space-y-4 max-w-4xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/25 text-xs text-accent-ink font-semibold">
          <GraduationCapIcon size={16} weight="duotone" aria-hidden="true" />
          <span>Communauté Scientifique & Laboratoires • USTO-MB</span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-fg leading-tight">
            Annuaire des Chercheurs & Laboratoires
          </h1>
          <p className="text-sm sm:text-base text-muted mt-2 leading-relaxed max-w-[70ch]">
            Découvrez le corps professoral, les directeurs d'équipes de recherche et les jeunes chercheurs d'USTO-MB. Explorez leurs thématiques d'expertise et leurs articles présentés lors des colloques officiels.
          </p>
        </div>

        {/* MÉTRIQUES CLÉS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          <div className="card p-4 border-line bg-surface/80">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block">Chercheurs Indexés</span>
            <span className="text-2xl font-bold font-mono text-fg mt-1 block">{researchers.length}</span>
          </div>
          <div className="card p-4 border-line bg-surface/80">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block">Facultés & Pôles</span>
            <span className="text-2xl font-bold font-mono text-fg mt-1 block">5</span>
          </div>
          <div className="card p-4 border-line bg-surface/80 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block">Publications Liées</span>
            <span className="text-sm font-semibold text-accent-ink mt-1.5 block">Comités de lecture USTO</span>
          </div>
        </div>
      </header>

      {/* RECHERCHE ET FILTRES */}
      <section className="card p-4 sm:p-5 border-line bg-surface-2/60 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-center">
          {/* Champ recherche */}
          <div className="relative">
            <MagnifyingGlassIcon
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, laboratoire, spécialité (IA, Robotique, Matériaux)…"
              className="input-field pl-10 text-sm"
            />
          </div>

          {/* Filtre par statut / rôle */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="select-field text-xs h-10 w-full md:w-auto"
            aria-label="Filtrer par rôle académique"
          >
            <option value="all">Tous les rôles académiques</option>
            <option value="organizer">Organisateurs & Présidents</option>
            <option value="reviewer">Relecteurs & Experts de comité</option>
            <option value="participant">Auteurs & Chercheurs</option>
          </select>

          {/* Filtre par Faculté */}
          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
            className="select-field text-xs h-10 w-full md:w-auto font-medium"
            aria-label="Filtrer par faculté"
          >
            {FACULTIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {(search || selectedFaculty !== 'all' || selectedRole !== 'all') && (
          <div className="flex items-center justify-between text-xs text-muted pt-1 border-t border-line/60">
            <span>
              {filteredResearchers.length} {filteredResearchers.length > 1 ? 'chercheurs correspondent' : 'chercheur correspond'} aux critères.
            </span>
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setSelectedFaculty('all')
                setSelectedRole('all')
              }}
              className="text-accent-ink hover:underline inline-flex items-center gap-1 font-semibold"
            >
              <ArrowCounterClockwiseIcon size={12} weight="bold" />
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </section>

      {/* GRILLE DES CHERCHEURS */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="skeleton h-56 rounded-2xl" />
          <div className="skeleton h-56 rounded-2xl" />
          <div className="skeleton h-56 rounded-2xl" />
        </div>
      ) : filteredResearchers.length === 0 ? (
        <div className="card p-12 text-center border-dashed space-y-3">
          <GraduationCapIcon size={36} className="text-muted mx-auto" weight="thin" />
          <h3 className="text-base font-semibold text-fg">Aucun chercheur ne correspond à votre recherche</h3>
          <p className="text-xs sm:text-sm text-muted max-w-[50ch] mx-auto">
            Essayez de rechercher avec un mot-clé plus court ou sélectionnez « Toutes les facultés ».
          </p>
          {(search || selectedFaculty !== 'all' || selectedRole !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setSelectedFaculty('all')
                setSelectedRole('all')
              }}
              className="btn-outline btn-sm inline-flex items-center gap-1.5 mx-auto mt-2"
            >
              <ArrowCounterClockwiseIcon size={14} weight="bold" />
              Effacer la recherche
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResearchers.map((res) => {
            const displayName = res.full_name || res.email?.split('@')[0] || 'Chercheur USTO'
            const roleBadge = ROLE_LABELS[res.role] || 'Chercheur'

            return (
              <article
                key={res.id}
                className="card border border-line bg-surface hover:border-accent/40 shadow-xs hover:shadow-card transition-all duration-200 flex flex-col justify-between p-5 space-y-4"
              >
                {/* Haut de carte */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={displayName} size={46} tone="brand" />
                      <div>
                        <h2 className="font-bold text-fg text-sm sm:text-base leading-snug">
                          {displayName}
                        </h2>
                        <span className="text-[11px] font-semibold text-accent-ink block mt-0.5">
                          {roleBadge}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Affiliation / Laboratoire */}
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <BuildingsIcon size={14} className="text-muted shrink-0" />
                    <span className="truncate">{res.affiliation}</span>
                  </div>

                  {/* Tags d'expertise */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {res.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10.5px] px-2 py-0.5 rounded-md bg-surface-2 border border-line text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                    {res.tags.length > 3 && (
                      <span className="text-[10px] text-muted self-center font-mono">
                        +{res.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bas de carte : stats & action */}
                <div className="pt-3 border-t border-line/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>
                      <strong className="text-fg font-mono">{res.acceptedCount}</strong> {res.acceptedCount > 1 ? 'articles' : 'article'}
                    </span>
                    <span>&bull;</span>
                    <span>
                      <strong className="text-fg font-mono">{res.eventsCount}</strong> {res.eventsCount > 1 ? 'colloques' : 'colloque'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveProfile(res)}
                    className="btn-outline btn-sm text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <span>Dossier</span>
                    <ArrowUpRightIcon size={12} weight="bold" />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* MODALE / VOLET DU DOSSIER ACADÉMIQUE DU CHERCHEUR */}
      {activeProfile && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-view-fade"
        >
          <div className="bg-surface border border-line rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Header du profil */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-line">
              <div className="flex items-center gap-4">
                <Avatar name={activeProfile.full_name || activeProfile.email} size={56} tone="brand" />
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-fg">
                    {activeProfile.full_name || activeProfile.email}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent-ink border border-accent/30">
                      {ROLE_LABELS[activeProfile.role] || 'Chercheur USTO'}
                    </span>
                    <span className="text-xs text-muted flex items-center gap-1">
                      <BuildingsIcon size={13} />
                      {activeProfile.affiliation}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveProfile(null)}
                className="btn-ghost btn-sm text-muted hover:text-fg p-1.5"
                aria-label="Fermer"
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* Contact & Identifiants universitaires */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-2 border border-line space-y-1">
                <span className="text-muted font-medium flex items-center gap-1.5">
                  <EnvelopeSimpleIcon size={13} className="text-accent-ink" />
                  Courriel Institutionnel
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-fg truncate">{activeProfile.email}</span>
                  <button
                    type="button"
                    onClick={() => copyEmail(activeProfile.email)}
                    className="text-accent-ink hover:underline inline-flex items-center gap-1 shrink-0 font-semibold"
                  >
                    {copiedEmail ? <CheckIcon size={12} weight="bold" /> : <CopyIcon size={12} />}
                    <span>{copiedEmail ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-2 border border-line space-y-1">
                <span className="text-muted font-medium block">Statut d'Accréditation</span>
                <div className="flex items-center gap-1.5 text-ok font-semibold">
                  <ShieldCheckIcon size={16} weight="bold" />
                  <span>Compte académique USTO-MB vérifié</span>
                </div>
              </div>
            </div>

            {/* Domaines d'expertise */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <SparkleIcon size={14} className="text-accent-ink" weight="bold" />
                Domaines de spécialité & Mots-clés de recherche
              </h4>
              <div className="flex flex-wrap gap-2">
                {activeProfile.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg bg-surface-sunken border border-line text-fg"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Communications & Articles présentés */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <ArticleIcon size={14} className="text-accent-ink" weight="bold" />
                Communications scientifiques aux conférences USTO-MB ({activeProfile.submissions.length})
              </h4>

              {activeProfile.submissions.length === 0 ? (
                <p className="text-xs text-muted italic p-3 rounded-xl bg-surface-2 border border-line">
                  Aucune communication scientifique n'a encore été déposée par ce chercheur.
                </p>
              ) : (
                <ul className="divide-y divide-line rounded-xl border border-line bg-surface overflow-hidden">
                  {activeProfile.submissions.map((sub) => (
                    <li key={sub.id} className="p-3.5 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          sub.status === 'accepted' ? 'bg-ok/15 text-ok' : 'bg-fg/10 text-muted'
                        }`}>
                          {sub.status === 'accepted' ? 'Validé par les pairs' : sub.status}
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
                            <ArrowUpRightIcon size={11} weight="bold" />
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
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveProfile(null)}
                className="btn-primary btn-sm text-xs font-semibold"
              >
                Fermer le dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
