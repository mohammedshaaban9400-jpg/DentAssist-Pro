import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'

type Props = {
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      // Small delay so the modal is painted before we focus
      const t = setTimeout(() => confirmRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onConfirm, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="p-6">
          <div className="mb-4 flex items-start gap-3">
            {danger && (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50">
                <AlertTriangle className="size-5 text-rose-600" />
              </span>
            )}
            <div>
              {title && (
                <p className="mb-1 text-sm font-bold text-slate-900">{title}</p>
              )}
              <p className="text-sm leading-relaxed text-slate-600">{message}</p>
            </div>
          </div>

          <div className={`flex gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {cancelLabel ?? (isAr ? 'إلغاء' : 'Cancel')}
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={onConfirm}
              className={`flex-1 cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                danger
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-teal-600 hover:bg-teal-700'
              }`}
            >
              {confirmLabel ?? (isAr ? 'تأكيد' : 'Confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
