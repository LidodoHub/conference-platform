import { useState } from 'react'
import {
  PencilSimpleIcon,
  PaperPlaneTiltIcon,
  LockSimpleIcon,
  ArrowCounterClockwiseIcon,
  TrashIcon,
  ArrowRightIcon,
  InfoIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { writeError } from '../../lib/errors'
import { TYPE_LABELS, FORMAT_LABELS, PHASE_LABELS, STATUS_LABELS, STATUS_BADGE, formatDateRange } from '../../lib/constants'
import { cleanDescription } from '../../lib/cover'
import EventForm from './EventForm'

const REFUSED = "Modification refusée : tu n'es pas organisateur de cet événement."

// Onglet Organisation > Événement : informations, publication, phase, suppression du brouillon.
export default function EventSettings({ event, pendingCount, onChanged, onDeleted }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const isClosed = ['closed', 'archived'].includes(event.status)
  const isLive = event.status === 'ongoing'
  const lockedFields = isLive ? ['start_date', 'end_date', 'type', 'format'] : []

  const update = async (changes, okText) => {
    setError(null)
    setNotice(null)
    const res = await supabase.from('events').update(changes).eq('id', event.id).select('id')
    const msg = writeError(res, REFUSED)
    if (msg) {
      setError(msg)
      return false
    }
    if (okText) setNotice(okText)
    onChanged()
    return true
  }

  const saveInfo = async (values) => {
    const ok = await update(values, 'Informations enregistrées.')
    if (ok) setEditing(false)
  }

  const changePhase = (phase) => {
    if (phase === 'organizational') {
      const msg =
        pendingCount > 0
          ? `${pendingCount} article(s) attendent encore une décision ou une révision. Clore la phase scientifique gèlera les dépôts, les reviews et les décisions. Continuer ?`
          : 'Clore la phase scientifique ? Plus aucun dépôt, review ni décision ne sera possible (tu pourras la rouvrir).'
      if (!window.confirm(msg)) return
    }
    update({ phase }, phase === 'organizational' ? 'Phase organisationnelle ouverte.' : 'Phase scientifique rouverte.')
  }

  const LIFECYCLE = {
    published: { to: 'ongoing', label: "Démarrer l'événement", hint: "Marque l'événement comme en cours (le jour J)." },
    ongoing: { to: 'closed', label: "Clôturer l'événement", hint: "L'événement est terminé : certificats et statistiques restent disponibles." },
    closed: { to: 'archived', label: 'Archiver', hint: "Retire l'événement des listes actives. Les données sont conservées." },
  }
  const next = LIFECYCLE[event.status]
  const advance = () => {
    if (!window.confirm(`${next.label} ? ${next.hint}`)) return
    update({ status: next.to }, 'Statut mis à jour.')
  }

  const requestPublication = () =>
    update({ status: 'pending_approval' }, 'Demande envoyée : un administrateur va valider la publication.')

  const deleteDraft = async () => {
    if (!window.confirm('Supprimer ce brouillon ? Tout son contenu sera supprimé.')) return
    setError(null)
    const res = await supabase.from('events').delete().eq('id', event.id).select('id')
    const msg = writeError(res, 'Suppression refusée.')
    if (msg) setError(msg)
    else onDeleted()
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {error && (
        <div role="alert" className="alert-error">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="alert-success">
          {notice}
        </div>
      )}

      {/* Informations */}
      <section className="card-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-fg">Informations</h3>
            <p className="text-sm text-muted mt-0.5">Titre, dates, lieu et format affichés sur la fiche publique.</p>
          </div>
          {isClosed ? (
            <span className="text-xs font-semibold text-muted inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-line shrink-0">
              <LockSimpleIcon size={14} weight="bold" className="text-muted" aria-hidden="true" />
              Événement clôturé • Verrouillé
            </span>
          ) : !editing ? (
            <button type="button" className="btn-outline btn-sm" onClick={() => setEditing(true)}>
              <PencilSimpleIcon size={15} aria-hidden="true" />
              Modifier
            </button>
          ) : null}
        </div>

        {editing ? (
          <div className="mt-6">
            {isLive && (
              <div className="alert-info text-xs flex items-center gap-2 mb-4 p-3 rounded-xl bg-accent/10 border border-accent/25 text-fg">
                <InfoIcon size={18} className="text-accent-ink shrink-0" aria-hidden="true" />
                <span>
                  <strong>Événement en direct (Jour J) :</strong> Les dates, le type et le format sont verrouillés pour préserver la conformité des présences et des sessions.
                </span>
              </div>
            )}
            <EventForm
              initial={{ ...event, description: cleanDescription(event.description || ''), location: event.location || '' }}
              submitLabel="Enregistrer"
              busyLabel="Enregistrement…"
              onSubmit={saveInfo}
              onCancel={() => setEditing(false)}
              lockedFields={lockedFields}
            />
          </div>
        ) : (
          <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-muted">Type et format</dt>
              <dd className="text-fg mt-0.5">
                {TYPE_LABELS[event.type] || event.type}, {(FORMAT_LABELS[event.format] || event.format || '').toLowerCase()}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Dates</dt>
              <dd className="text-fg mt-0.5 num">{formatDateRange(event.start_date, event.end_date)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">Lieu</dt>
              <dd className="text-fg mt-0.5">{event.location || 'Non renseigné'}</dd>
            </div>
          </dl>
        )}
      </section>

      {/* Publication */}
      <section className="card-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-fg flex items-center gap-2">
              Publication
              <span className={STATUS_BADGE[event.status]}>{STATUS_LABELS[event.status]}</span>
            </h3>
            <p className="text-sm text-muted mt-1 max-w-[60ch]">
              {event.status === 'draft' &&
                'Visible seulement par toi. Demande la publication quand la fiche est prête : un administrateur la validera.'}
              {event.status === 'pending_approval' && 'Ta demande est en cours de validation par un administrateur.'}
              {['published', 'ongoing'].includes(event.status) && "L'événement est visible par tous les utilisateurs."}
              {['closed', 'archived'].includes(event.status) && "L'événement est terminé."}
            </p>
          </div>
          {next && (
            <button type="button" className="btn-outline" onClick={advance} title={next.hint}>
              <ArrowRightIcon size={16} aria-hidden="true" />
              {next.label}
            </button>
          )}
          {event.status === 'pending_approval' && (
            <button type="button" className="btn-ghost" onClick={() => update({ status: 'draft' }, 'Demande retirée : l’événement est revenu en brouillon.')}>
              Retirer la demande
            </button>
          )}
          {event.status === 'draft' && (
            <button type="button" className="btn-accent" onClick={requestPublication}>
              <PaperPlaneTiltIcon size={16} aria-hidden="true" />
              Demander la publication
            </button>
          )}
        </div>
      </section>

      {/* Phase */}
      <section className="card-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-[60ch]">
            <h3 className="font-semibold text-fg">{PHASE_LABELS[event.phase]}</h3>
            <p className="text-sm text-muted mt-1">
              {event.phase === 'scientific'
                ? "Clore la phase gèle les dépôts, les reviews et les décisions, et ouvre les invitations et le programme définitif."
                : "La phase scientifique est close. Tu peux la rouvrir, par exemple pour relancer des reviews ou traiter une resoumission."}
              {event.phase === 'scientific' && pendingCount > 0 && (
                <span className="text-warn"> {pendingCount} article(s) sont encore en attente.</span>
              )}
            </p>
          </div>
          {event.phase === 'scientific' ? (
            <button type="button" className="btn-primary" onClick={() => changePhase('organizational')}>
              <LockSimpleIcon size={16} aria-hidden="true" />
              Clore la phase scientifique
            </button>
          ) : (
            <button type="button" className="btn-outline" onClick={() => changePhase('scientific')}>
              <ArrowCounterClockwiseIcon size={16} aria-hidden="true" />
              Rouvrir la phase scientifique
            </button>
          )}
        </div>
      </section>

      {event.status === 'draft' && (
        <section className="rounded-2xl border border-bad/30 p-5 sm:p-7 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-fg">Supprimer le brouillon</h3>
            <p className="text-sm text-muted mt-1">Efface l'événement et tout son contenu. Action définitive.</p>
          </div>
          <button type="button" className="btn-danger" onClick={deleteDraft}>
            <TrashIcon size={16} aria-hidden="true" />
            Supprimer
          </button>
        </section>
      )}
    </div>
  )
}
