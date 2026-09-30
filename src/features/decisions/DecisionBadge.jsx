export const decisionStatuses = {
  accepted: {
    label: 'Accepté',
    class: 'badge-success',
    icon: '✓',
  },
  rejected: {
    label: 'Rejeté',
    class: 'badge-error',
    icon: '✗',
  },
  revision_requested: {
    label: 'Révision demandée',
    class: 'badge-warning',
    icon: '↻',
  },
}

export function DecisionBadge({ submissionId }) {
  const [decision, setDecision] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDecision = async () => {
      try {
        const { data, error } = await fetchJson(`/api/submissions/${submissionId}/decisions`)
        if (error) throw error
        setDecision(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDecision()
  }, [submissionId])

  if (loading) {
    return <span className="badge-submitted">En attente...</span>
  }

  if (error || !decision) {
    return <span className="badge-submitted">En attente de décision</span>
  }

  const status = decisionStatuses[decision.status]
  if (!status) return null

  return (
    <span
      className={`${status.class} text-xs font-medium px-2.5 py-0.5 rounded-full inline-flex items-center gap-1`}
      title={`${status.label}${decision.notes ? ` — ${decision.notes}` : ''}`}
    >
      {status.icon}
      {status.label}
    </span>
  )
}

export default DecisionBadge