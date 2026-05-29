import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'

export function ToastHost() {
  const { t, i18n } = useTranslation()
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  const isRtl = i18n.dir() === 'rtl'

  if (toasts.length === 0) return null

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col gap-2 px-4 sm:px-6 ${
        isRtl ? 'items-start ps-4 sm:ps-6' : 'items-end pe-4 sm:pe-6'
      }`}
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex max-w-md cursor-default items-start gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : toast.type === 'error'
                ? 'border-rose-100 bg-rose-50 text-rose-700'
                : 'border-slate-100 bg-white text-slate-800 shadow-[var(--shadow-dent-card)]'
          }`}
        >
          <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="cursor-pointer rounded-md p-1 text-current opacity-60 transition-opacity hover:opacity-100"
            aria-label={t('common.close')}
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
