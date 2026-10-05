// En-tête de page : titre, phrase d'explication, actions à droite (dessous sur mobile).
export default function PageHeader({ title, description, actions, eyebrow }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
      <div className="min-w-0">
        {eyebrow && <p className="section-label mb-2">{eyebrow}</p>}
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-fg leading-[1.1]">{title}</h1>
        {description && <p className="text-muted mt-2 max-w-[60ch] leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </header>
  )
}
