import { createContext, useContext, useState, useEffect, useCallback, useRef, useId } from 'react'
import { useLanguage } from './LanguageContext'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const { t } = useLanguage()
  const [dialog, setDialog] = useState(null)
  const [entered, setEntered] = useState(false)
  const resolverRef = useRef(null)
  const confirmBtnRef = useRef(null)
  const cancelBtnRef = useRef(null)
  const titleId = useId()
  const descId = useId()

  const close = useCallback((result) => {
    setEntered(false)
    const resolve = resolverRef.current
    resolverRef.current = null
    setDialog(null)
    if (resolve) resolve(result)
  }, [])

  const confirm = useCallback((options) => {
    if (resolverRef.current) {
      resolverRef.current(false)
      resolverRef.current = null
    }
    const normalized = typeof options === 'string' ? { title: options } : options || {}
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setEntered(false)
      setDialog({
        title: normalized.title || '',
        description: normalized.description || '',
        confirmLabel: normalized.confirmLabel || null,
        cancelLabel: normalized.cancelLabel || null,
        variant: normalized.variant === 'danger' ? 'danger' : 'default',
      })
    })
  }, [])

  useEffect(() => {
    if (!dialog) return undefined

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const rafId = requestAnimationFrame(() => {
      setEntered(true)
      if (dialog.variant === 'danger') {
        cancelBtnRef.current?.focus()
      } else {
        confirmBtnRef.current?.focus()
      }
    })

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [dialog, close])

  const confirmText = dialog?.confirmLabel || t('confirm.confirmLabel')
  const cancelText = dialog?.cancelLabel || t('confirm.cancelLabel')

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
            entered ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => close(false)}
          role="presentation"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={dialog.description ? descId : undefined}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-white/10 shadow-2xl p-6 transition-all duration-200 ${
              entered ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            }`}
          >
            <h2
              id={titleId}
              className="text-[17px] font-semibold tracking-tight text-neutral-900 dark:text-white"
            >
              {dialog.title}
            </h2>
            {dialog.description && (
              <p
                id={descId}
                className="text-[13.5px] leading-relaxed text-neutral-500 dark:text-neutral-400 mt-2 whitespace-pre-line"
              >
                {dialog.description}
              </p>
            )}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                ref={cancelBtnRef}
                type="button"
                onClick={() => close(false)}
                className="px-4 py-2 rounded-xl text-[13px] font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={() => close(true)}
                className={
                  dialog.variant === 'danger'
                    ? 'px-4 py-2 rounded-xl text-[13px] font-medium bg-red-600 text-white hover:bg-red-700 dark:bg-red-600/90 dark:hover:bg-red-600 transition-colors cursor-pointer'
                    : 'px-4 py-2 rounded-xl text-[13px] font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors cursor-pointer'
                }
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return ctx
}
