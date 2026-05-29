import { useCallback, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Maximize2, Minus, Minimize2, X } from 'lucide-react'
import { applyAppLogoFallback, defaultAppLogoSrc } from '@/lib/appBrand'
import { isElectronShell, showDesktopWindowChrome } from '@/lib/electronShell'
import { getConfigs, readUserDataFileDataUrl } from '@/services/dbService'

export function WindowTitleBar() {
  const { t } = useTranslation()
  const [maximized, setMaximized] = useState(false)
  const [clinicLogo, setClinicLogo] = useState<string | null>(null)
  const shell = isElectronShell()
  const showChrome = showDesktopWindowChrome()

  useEffect(() => {
    if (!shell) return
    getConfigs(['clinic_logo_path']).then(async (cfg) => {
      if (cfg.clinic_logo_path) {
        try {
          const raw = await readUserDataFileDataUrl(cfg.clinic_logo_path)
          if (raw) setClinicLogo(raw)
        } catch { /* ignore */ }
      }
    })
  }, [shell])

  const minimize = useCallback(async () => {
    await window.dentassist?.windowMinimize?.()
  }, [])

  const toggleMax = useCallback(async () => {
    const r = await window.dentassist?.windowToggleMaximize?.()
    setMaximized(!!r?.maximized)
  }, [])

  const close = useCallback(async () => {
    await window.dentassist?.windowClose?.()
  }, [])

  if (!showChrome) return null

  const btn =
    'app-no-drag flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 active:scale-95'

  return (
    <header className="flex h-11 shrink-0 cursor-default items-center justify-between border-b border-slate-200/90 bg-gradient-to-b from-white to-slate-50/95 px-2 shadow-[0_1px_0_rgba(15,23,42,0.06)] select-none">
      <div
        className={`flex min-w-0 flex-1 items-center gap-2 pe-3 ${shell ? 'app-drag' : ''}`}
        onDoubleClick={shell ? () => void toggleMax() : undefined}
      >
        <span
          className={`flex size-6 shrink-0 items-center justify-center rounded-md overflow-hidden ${shell ? 'app-no-drag' : ''}`}
        >
          <img
            src={clinicLogo || defaultAppLogoSrc()}
            alt="DentAssist"
            className="size-full object-contain"
            onError={(e) => applyAppLogoFallback(e.currentTarget)}
          />
        </span>
        <span className="truncate text-sm font-bold tracking-tight text-slate-700">{t('app.name')}</span>
      </div>
      {shell ? (
        <div
          className="app-no-drag flex shrink-0 items-center gap-0.5"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button type="button" className={btn} onClick={() => void minimize()} aria-label={t('shell.winMinimize')}>
            <Minus className="size-4" strokeWidth={2.25} aria-hidden />
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => void toggleMax()}
            aria-label={maximized ? t('shell.winRestore') : t('shell.winMaximize')}
          >
            {maximized ? (
              <Minimize2 className="size-3.5" strokeWidth={2.25} aria-hidden />
            ) : (
              <Maximize2 className="size-3.5" strokeWidth={2.25} aria-hidden />
            )}
          </button>
          <button
            type="button"
            className={`${btn} hover:bg-rose-100 hover:text-rose-700`}
            onClick={() => void close()}
            aria-label={t('shell.winClose')}
          >
            <X className="size-4" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      ) : (
        <span className="shrink-0 rounded-md border border-slate-200/80 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {t('shell.browserChromeHint')}
        </span>
      )}
    </header>
  )
}
