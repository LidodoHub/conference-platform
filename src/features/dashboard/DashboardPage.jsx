import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import CountUp from '../../components/reactbits/CountUp'
import FadeContent from '../../components/reactbits/FadeContent'
import { getClientActions, IN_EVENT_FEATURES, ROLE_LABELS } from '../../data/appFeatures'

const ACCENT = {
  ink: { border: 'border-l-ink', btn: 'btn-primary' },
  gold: { border: 'border-l-gold', btn: 'btn-accent' },
}

export default function DashboardPage({ onNavigateEvents, onNavigateAdmin, isAdmin, userProfile }) {
  const [stats, setStats] = useState({ events: 0, submissions: 0, participants: 0, pending: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      const [eventsRes, submissionsRes, participantsRes, pendingRes] = await Promise.all([
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('submissions').select('id', { count: 'exact', head: true }),
        supabase.from('event_participants').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval'),
      ])
      setStats({
        events: eventsRes.count ?? 0,
        submissions: submissionsRes.count ?? 0,
        participants: participantsRes.count ?? 0,
        pending: pendingRes.count ?? 0,
      })
      setLoading(false)
    }
    fetchStats()
  }, [])

  const actions = getClientActions(isAdmin)
  const roleLabel = ROLE_LABELS[userProfile?.role] ?? 'Utilisateur'

  return (
    <div className="page-container pb-16">
      <FadeContent className="mb-10 lg:mb-12">
        <p className="section-label mb-3">Tableau de bord</p>
        <h1 className="font-display font-bold text-4xl sm:text-5xl text-ink tracking-tight">
          Bonjour{userProfile?.full_name ? `, ${userProfile.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-taupe text-sm sm:text-base mt-3 max-w-xl leading-relaxed">
          Bienvenue sur CONFERA — votre espace pour les conférences et colloques scientifiques.
        </p>
        {userProfile && (
          <span className="inline-block mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-taupe border border-taupe/25 rounded-full px-3 py-1">
            {roleLabel}
          </span>
        )}
      </FadeContent>

      {/* KPIs */}
      <FadeContent delay={0.05} className="mb-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Événements', value: stats.events },
            { label: 'Soumissions', value: stats.submissions },
            { label: 'Participants', value: stats.participants },
            { label: 'En validation', value: stats.pending, highlight: stats.pending > 0 },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className={`card-panel py-4 sm:py-5 ${kpi.highlight ? 'border border-gold/25' : ''}`}
            >
              <p className="section-label mb-1.5">{kpi.label}</p>
              <p className="font-display font-semibold text-2xl sm:text-3xl text-ink tabular-nums">
                {loading ? '—' : <CountUp to={kpi.value} duration={1.2} className="inline" />}
              </p>
            </div>
          ))}
        </div>
      </FadeContent>

      {/* Accès principaux — seulement ce qui existe dans l'app */}
      <FadeContent delay={0.08} className="mb-10">
        <p className="section-label mb-4">Accès rapide</p>
        <div className={`grid gap-4 ${actions.length > 1 ? 'sm:grid-cols-2' : 'max-w-lg'}`}>
          {actions.map((action) => {
            const style = ACCENT[action.accent] || ACCENT.ink
            const onClick = action.id === 'admin' ? onNavigateAdmin : onNavigateEvents
            return (
              <article
                key={action.id}
                className={`card-panel border-l-4 ${style.border} flex flex-col`}
              >
                <h2 className="font-display font-semibold text-xl text-ink">{action.title}</h2>
                <p className="text-sm text-taupe mt-2 leading-relaxed flex-1">
                  {action.description}
                </p>
                {action.id === 'admin' && stats.pending > 0 && (
                  <p className="text-xs text-gold mt-2 font-medium">
                    {stats.pending} demande{stats.pending > 1 ? 's' : ''} en attente
                  </p>
                )}
                <button onClick={onClick} className={`${style.btn} mt-5 w-full sm:w-auto`}>
                  {action.cta}
                </button>
              </article>
            )
          })}
        </div>
      </FadeContent>

      {/* Rappel : le reste est dans la fiche événement */}
      <FadeContent delay={0.1}>
        <div className="card-panel bg-paper-dark/30 border border-ink/6">
          <p className="section-label mb-3">Depuis la fiche d'un événement</p>
          <p className="text-sm text-taupe mb-4 max-w-2xl leading-relaxed">
            Inscriptions, paiements, certificats, soumissions et reviews se gèrent directement
            sur la page de détail — pas besoin d'un menu séparé pour chaque action.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {IN_EVENT_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-sm text-ink/80">
                <span className="w-1 h-1 rounded-full bg-sage flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </FadeContent>
    </div>
  )
}
