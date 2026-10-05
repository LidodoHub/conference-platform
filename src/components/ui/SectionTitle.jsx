// Titre de section dans une page, avec compteur et actions optionnels.
export default function SectionTitle({ title, count, description, actions, as: Tag = 'h2' }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
      <div className="min-w-0">
        <Tag className="text-lg font-semibold tracking-tight text-fg flex items-baseline gap-2">
          {title}
          {count != null && <span className="num font-mono text-sm font-normal text-faint">{count}</span>}
        </Tag>
        {description && <p className="text-sm text-muted mt-1 max-w-[65ch]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
