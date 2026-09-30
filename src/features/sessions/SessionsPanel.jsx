import RecordList from '../shared/RecordList'

export default function SessionsPanel({ eventId, canEdit }) {
  return (
    <div className="space-y-10">
      <RecordList
        table="sessions"
        eventId={eventId}
        label="Programme"
        title="Sessions"
        canEdit={canEdit}
        fields={[
          { name: 'title', label: 'Titre de session', required: true },
          { name: 'chair', label: 'Président de séance' },
          { name: 'speakers', label: 'Intervenants' },
          { name: 'slot', label: 'Créneau (ex. 09:00–10:30)' },
        ]}
        renderItem={(row) => (
          <>
            <p className="text-sm font-medium text-ink">{row.title}</p>
            <p className="text-xs text-taupe mt-1">
              {row.slot} {row.chair && `· prés. ${row.chair}`} {row.speakers && `· ${row.speakers}`}
            </p>
          </>
        )}
      />

      <RecordList
        table="workshops"
        eventId={eventId}
        label="Ateliers"
        title="Workshops"
        canEdit={canEdit}
        fields={[
          { name: 'title', label: 'Atelier', required: true },
          { name: 'facilitator', label: 'Animateur' },
          { name: 'capacity', label: 'Capacité', type: 'number' },
        ]}
        renderItem={(row) => (
          <>
            <p className="text-sm font-medium text-ink">{row.title}</p>
            <p className="text-xs text-taupe mt-1">
              {row.facilitator} {row.capacity && `· ${row.capacity} places`}
            </p>
          </>
        )}
      />
    </div>
  )
}
