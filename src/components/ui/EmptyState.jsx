// État vide : dit ce qui manque et, si possible, comment le remplir.
export default function EmptyState({ icon: Icon, title, body, action, compact = false }) {
  return (
    <div
      className={`flex flex-col items-center text-center rounded-2xl border border-dashed border-line ${
        compact ? 'px-4 py-8' : 'px-6 py-12'
      }`}
    >
      {Icon && (
        <span className="mb-4 inline-flex w-11 h-11 items-center justify-center rounded-xl bg-surface-2 text-muted">
          <Icon size={22} weight="duotone" />
        </span>
      )}
      <p className="font-semibold text-fg">{title}</p>
      {body && <p className="text-sm text-muted mt-1.5 max-w-md leading-relaxed">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
