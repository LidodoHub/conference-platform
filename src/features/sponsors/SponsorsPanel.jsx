import RecordList from '../shared/RecordList'

export default function SponsorsPanel({ eventId, canEdit }) {
  return (
    <RecordList
      table="sponsors"
      eventId={eventId}
      label="Partenaires"
      title="Sponsors"
      canEdit={canEdit}
      fields={[
        { name: 'name', label: 'Nom', required: true },
        { name: 'tier', label: 'Niveau (or, argent, bronze)' },
        { name: 'benefits', label: 'Avantages', type: 'textarea', full: true },
      ]}
      renderItem={(row) => (
        <>
          <p className="text-sm font-medium text-ink">{row.name}</p>
          <p className="text-xs text-taupe mt-1">
            <span className="font-mono uppercase tracking-wide">{row.tier || 'partenaire'}</span>
            {row.benefits && ` · ${row.benefits}`}
          </p>
        </>
      )}
    />
  )
}
