import { useState, useEffect, useCallback, useRef } from 'react'
import {
  BellIcon,
  BellSimpleSlashIcon,
  GavelIcon,
  TicketIcon,
  CoinsIcon,
  ArticleIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  ChecksIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'

const ICONS = {
  decision: GavelIcon,
  invitation: TicketIcon,
  registration: TicketIcon,
  payment: CoinsIcon,
  submission: ArticleIcon,
  moderation: ShieldCheckIcon,
  role: UserCircleIcon,
}

const ago = (iso) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  if (d < 30) return `il y a ${d} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// Cloche de notifications : ouverture au survol ou au clic
export default function NotificationsMenu({ onOpenEvent, className = '' }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [available, setAvailable] = useState(true)
  const panelRef = useRef(null)
  const timeoutRef = useRef(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, event_id, type, title, message, sent_at, read_at')
      .eq('recipient_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(30)
    if (error) setAvailable(false)
    else setItems(data)
  }, [user.id])

  useEffect(() => {
    load()
    const timer = setInterval(load, 60000)
    return () => clearInterval(timer)
  }, [load])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!panelRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (!open) load()
    setOpen(true)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setOpen(false)
    }, 280)
  }

  const unread = items.filter((n) => !n.read_at).length

  const markAllRead = async () => {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id)
    if (!ids.length) return
    const now = new Date().toISOString()
    setItems((list) => list.map((n) => (n.read_at ? n : { ...n, read_at: now })))
    await supabase.from('notifications').update({ read_at: now }).in('id', ids)
  }

  const openItem = async (n) => {
    setOpen(false)
    if (!n.read_at) {
      const now = new Date().toISOString()
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read_at: now } : x)))
      await supabase.from('notifications').update({ read_at: now }).eq('id', n.id)
    }
    if (n.event_id) onOpenEvent(n.event_id, n.type === 'decision' || n.type === 'submission' ? { tab: 'scientific' } : null)
  }

  if (!available) return null

  return (
    <div
      className="relative"
      ref={panelRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          if (!open) load()
        }}
        className={`${className} relative transition-transform duration-150 active:scale-95`}
        aria-label={unread ? `Notifications, ${unread} non lues` : 'Notifications'}
        aria-expanded={open}
        title="Notifications (survolez pour afficher)"
      >
        <BellIcon size={19} weight={unread ? 'fill' : 'regular'} aria-hidden="true" className="transition-transform duration-200 hover:rotate-6" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-accent text-on-accent text-[10px] font-semibold leading-4 text-center num animate-pulse shadow-xs">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-[72px] sm:top-12 sm:right-0 sm:w-[380px] z-50 card overflow-hidden shadow-[var(--shadow-lift)] border border-line bg-surface/98 backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-150 origin-top-right"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-surface-2/40">
            <p className="font-semibold text-fg text-sm">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="btn-ghost btn-sm -mr-2 text-xs">
                <ChecksIcon size={15} aria-hidden="true" />
                Tout marquer lu
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <BellSimpleSlashIcon size={28} className="mx-auto text-faint" aria-hidden="true" />
              <p className="mt-3 text-sm text-muted">Rien de nouveau. Décisions, invitations et paiements apparaîtront ici.</p>
            </div>
          ) : (
            <ul className="max-h-[min(70dvh,460px)] overflow-y-auto divide-y divide-line/60">
              {items.map((n) => {
                const Icon = ICONS[n.type] || BellIcon
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openItem(n)}
                      className={`w-full text-left px-4 py-3.5 flex gap-3 hover:bg-fg/5 transition-all duration-150 ${n.read_at ? '' : 'bg-accent/6 font-medium'}`}
                    >
                      <span
                        className={`inline-flex w-9 h-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-105 ${
                          n.read_at ? 'bg-surface-2 text-muted' : 'bg-accent/15 text-accent-ink'
                        }`}
                      >
                        <Icon size={18} weight="duotone" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className={`text-sm leading-snug ${n.read_at ? 'text-fg' : 'font-semibold text-fg'}`}>{n.title}</span>
                          {!n.read_at && <span className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0" aria-label="non lue" />}
                        </span>
                        <span className="block text-[13px] text-muted mt-0.5 leading-5">{n.message}</span>
                        <span className="block text-xs text-faint mt-1">{ago(n.sent_at)}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
