import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function DecisionForm({ submissionId, onSubmit, onReset }) {
  const [formData, setFormData] = useState({
    status: 'accepted',
    notes: '',
  })

  const { data: existingDecision, isLoading } = useQuery({
    queryKey: ['decision', submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decisions')
        .select('*')
        .eq('submission_id', submissionId)
        .single()
      if (error) throw error
      return data
    },
  })

  const mutation = useMutation({
    mutationFn: async ({ status, notes }) => {
      if (existingDecision) {
        const { data, error } = await supabase
          .from('decisions')
          .update({ status, notes, updated_at: new Date().toISOString() })
          .eq('id', existingDecision.id)
          .select()
          .single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase
          .from('decisions')
          .insert({
            submission_id: submissionId,
            status,
            notes,
            decided_by: supabase.auth.user().id,
            decided_at: new Date().toISOString(),
            notified_at: new Date().toISOString(),
          })
          .select()
          .single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => {
      toast.success('Décision enregistrée')
      onReset?.()
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate({ status: formData.status, notes: formData.notes })
  }

  useEffect(() => {
    if (existingDecision) {
      setFormData({
        status: existingDecision.status,
        notes: existingDecision.notes || '',
      })
    }
  }, [existingDecision])

  if (!existingDecision) {
    return null
  }

  const isOrganizer = existingDecision.decided_by === supabase.auth.user().id

  return (
    <div className="decision-card border border-ink/8 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span
            className={
              {
                accepted: 'badge-success',
                rejected: 'badge-error',
                revision_requested: 'badge-warning',
              }[existingDecision.status] || 'badge-submitted'
            }
          >
            {existingDecision.status.replace('_', ' ')}
          </span>
          <p className="text-sm font-medium text-ink">{existingDecision.status.replace('_', ' ')}</p>
        </div>
        {isOrganizer && (
          <button onClick={onReset} className="btn-ghost-gold btn-xs">
            Annuler
          </button>
        )}
      </div>

      <div className="text-xs text-taupe/70 mb-3">
        Décidée le <span className="font-mono">{new Date(existingDecision.decided_at).toLocaleDateString()}</span>
        {existingDecision.decided_by && (
          <>
            {' '}par{' '}
            <span className="font-medium text-ink">
              {existingDecision.decided_by === supabase.auth.user().id
                ? 'Vous'
                : 'un·e autre·s'}
            </span>
          </>
        )}
      </div>

      {existingDecision.notes && (
        <div className="bg-papier/20 rounded px-3 py-2 text-sm text-ink/80 mb-4">
          <span className="font-medium">Note :</span> {existingDecision.notes}
        </div>
      )}

      {isOrganizer && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-taupe block mb-1.5">Statut</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="input input-bordered input-xs w-full max-w-[220px]"
            >
              <option value="accepted">Accepté</option>
              <option value="rejected">Rejeté</option>
              <option value="revision_requested">Révision demandée</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-taupe block mb-1.5">Notes (optionnel)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="input input-bordered input-xs w-full text-xs"
              placeholder="Motifs, recommandations, notes pour les auteurs..."
            />
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary btn-sm w-full"
          >
            {mutation.isPending ? '...' : 'Enregistrer la décision'}
          </button>
        </form>
      )}
    </div>
  )
}

export function DecisionFormInline({ submissionId, onSubmit, onReset }) {
  const [formData, setFormData] = useState({
    status: 'accepted',
    notes: '',
  })

  const { data: existingDecision, isLoading } = useQuery({
    queryKey: ['decision', submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decisions')
        .select('*')
        .eq('submission_id', submissionId)
        .single()
      if (error) throw error
      return data
    },
  })

  const mutation = useMutation({
    mutationFn: async ({ status, notes }) => {
      if (existingDecision) {
        const { data, error } = await supabase
          .from('decisions')
          .update({ status, notes, updated_at: new Date().toISOString() })
          .eq('id', existingDecision.id)
          .select()
          .single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase
          .from('decisions')
          .insert({
            submission_id: submissionId,
            status,
            notes,
            decided_by: supabase.auth.user().id,
            decided_at: new Date().toISOString(),
            notified_at: new Date().toISOString(),
          })
          .select()
          .single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => {
      toast.success('Décision enregistrée')
      onReset?.()
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate({ status: formData.status, notes: formData.notes })
  }

  useEffect(() => {
    if (existingDecision) {
      setFormData({
        status: existingDecision.status,
        notes: existingDecision.notes || '',
      })
    }
  }, [existingDecision])

  if (!existingDecision) {
    return null
  }

  const isOrganizer = existingDecision.decided_by === supabase.auth.user().id

  return (
    <div className="decision-card border border-ink/8 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <span
            className={
              {
                accepted: 'badge-success',
                rejected: 'badge-error',
                revision_requested: 'badge-warning',
              }[existingDecision.status] || 'badge-submitted'
            }
          >
            {existingDecision.status.replace('_', ' ')}
          </span>
          <p className="text-sm font-medium text-ink">{existingDecision.status.replace('_', ' ')}</p>
        </div>
        {isOrganizer && (
          <button onClick={onReset} className="btn-ghost-gold btn-sm">
            Annuler
          </button>
        )}
      </div>

      <div className="text-xs text-taupe/70 mb-3">
        Décidée le <span className="font-mono">{new Date(existingDecision.decided_at).toLocaleDateString()}</span>
        {existingDecision.decided_by && (
          <>
            {' '}par{' '}
            <span className="font-medium text-ink">
              {existingDecision.decided_by === supabase.auth.user().id
                ? 'Vous'
                : 'un·e autre·s'}
            </span>
          </>
        )}
      </div>

      {existingDecision.notes && (
        <div className="bg-papier/20 rounded px-3 py-2 text-sm text-ink/80 mb-4">
          <span className="font-medium">Note :</span> {existingDecision.notes}
        </div>
      )}

      {isOrganizer && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-taupe block mb-1.5">Statut</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="input input-bordered input-xs w-full max-w-[220px]"
            >
              <option value="accepted">Accepté</option>
              <option value="rejected">Rejeté</option>
              <option value="revision_requested">Révision demandée</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-taupe block mb-1.5">Notes (optionnel)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="input input-bordered input-xs w-full text-xs"
              placeholder="Motifs, recommandations, notes pour les auteurs..."
            />
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary btn-sm w-full"
          >
            {mutation.isPending ? '...' : 'Enregistrer la décision'}
          </button>
        </form>
      )}
    </div>
  )
}

export default DecisionFormInline