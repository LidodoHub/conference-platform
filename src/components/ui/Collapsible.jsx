import { useState } from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'

/**
 * Composant de divulgation progressive (Accordéon / Rideau rétractable)
 * Permet de masquer les textes et détails secondaires derrière une flèche à gauche.
 */
export default function Collapsible({
  title,
  subtitle,
  badge,
  icon: Icon,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
  variant = 'card', // 'card' | 'subtle' | 'plain'
  className = '',
  headerClassName = '',
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  const handleToggle = () => {
    const next = !isOpen
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
  }

  const containerStyles = {
    card: 'card border-line bg-surface/80 overflow-hidden shadow-xs transition-colors',
    subtle: 'rounded-xl border border-line/70 bg-surface-2/40 overflow-hidden transition-colors',
    plain: 'border-b border-line/60 overflow-hidden',
  }[variant] || 'card border-line bg-surface/80 overflow-hidden shadow-xs'

  return (
    <div className={`${containerStyles} ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-3 text-left px-3.5 py-2.5 sm:px-4 sm:py-3 transition-colors hover:bg-fg/3 select-none ${headerClassName}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Flèche à gauche rotative */}
          <span
            className={`w-5 h-5 rounded flex items-center justify-center shrink-0 text-muted transition-transform duration-200 ease-out ${
              isOpen ? 'rotate-90 text-fg' : 'text-faint'
            }`}
            aria-hidden="true"
          >
            <CaretRightIcon size={14} weight="bold" />
          </span>

          {Icon && (
            <span className="text-muted shrink-0" aria-hidden="true">
              <Icon size={16} />
            </span>
          )}

          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-semibold text-fg tracking-tight truncate">
              {title}
            </span>
            {subtitle && (
              <span className="text-xs text-muted font-normal truncate hidden sm:inline">
                • {subtitle}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {badge}
          <span className="text-[11px] font-medium text-faint hover:text-muted hidden md:inline">
            {isOpen ? 'Masquer' : 'Afficher'}
          </span>
        </div>
      </button>

      {/* Rideau déployable */}
      {isOpen && (
        <div className="px-3.5 pb-3.5 pt-1 sm:px-4 sm:pb-4 border-t border-line/50 animate-view-fade">
          {children}
        </div>
      )}
    </div>
  )
}
