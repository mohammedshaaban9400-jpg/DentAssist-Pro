import { useTranslation } from 'react-i18next'
import { Monitor, XCircle } from 'lucide-react'
import { APP_BUILD_TIME } from '@/lib/buildTime'

function isElectronUserAgent(): boolean {
  return typeof navigator !== 'undefined' && /Electron\//.test(navigator.userAgent)
}

/**
 * Shown in production when `window.dentassist` is missing:
 * - normal browser / opened `index.html` → explain use the desktop shortcut;
 * - Electron window but preload failed → different repair steps.
 */
export function BrowserWrongLaunchScreen() {
  const { t } = useTranslation()
  const inElectron = isElectronUserAgent()
  const prefix = inElectron ? 'shell.wrongLaunch.electron' : 'shell.wrongLaunch'

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-slate-100 p-6 text-slate-800">
      <div className="w-full max-w-lg rounded-2xl border border-amber-200/80 bg-white p-8 shadow-[var(--shadow-dent-card)]">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <XCircle className="size-7" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{t(`${prefix}.title`)}</h1>
            <p className="text-sm leading-relaxed text-slate-600">{t(`${prefix}.body`)}</p>
            <ul className="list-inside list-disc space-y-2 text-sm text-slate-700">
              <li>{t(`${prefix}.step1`)}</li>
              <li>{t(`${prefix}.step2`)}</li>
              <li>{t(`${prefix}.step3`)}</li>
            </ul>
            <div className="flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50/80 px-4 py-3 text-sm text-teal-900">
              <Monitor className="size-5 shrink-0" aria-hidden />
              <span className="leading-relaxed">{t(`${prefix}.hint`)}</span>
            </div>
            <p className="mt-4 border-t border-slate-100 pt-3 font-mono text-[11px] leading-relaxed text-slate-500">
              {t('shell.buildStamp', { time: APP_BUILD_TIME })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
