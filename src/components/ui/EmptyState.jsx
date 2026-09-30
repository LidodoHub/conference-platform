export default function EmptyState({ title, body, action }) {
  return (
    <div className="text-center py-10 px-4">
      <p className="section-heading text-lg">{title}</p>
      {body && <p className="text-sm text-taupe mt-2 max-w-md mx-auto leading-relaxed">{body}</p>}
      {action}
    </div>
  )
}
