// Titre de section dans une page, avec compteur et actions optionnels.
export default function SectionTitle({ title, subtitle, count, description, actions, as: Tag = 'h2' }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 mb-4">
      <div className="min-w-0">
        <Tag className="text-base sm:text-lg font-bold tracking-tight flex items-baseline gap-2 flex-wrap">
          <span className="text-fg">{title}</span>
          {subtitle && <span className="text-muted font-normal text-sm sm:text-base">{subtitle}</span>}
          {count != null && <span className="num font-mono text-sm font-normal text-faint">{count}</span>}
        </Tag>
        {description && <p className="text-sm text-muted mt-1 max-w-[65ch]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
