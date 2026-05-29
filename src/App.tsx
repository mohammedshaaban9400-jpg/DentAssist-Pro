import { useEffect } from 'react'
import { ActivationScreen } from '@/components/ActivationScreen'
import { LoginScreen } from '@/components/LoginScreen'
import { LoggedInRoutes } from '@/routes/LoggedInRoutes'
import { NativeAppChrome } from '@/components/NativeAppChrome'
import { SplashScreen } from '@/components/SplashScreen'
import { TrialBanner } from '@/components/TrialBanner'
import i18n from '@/i18n'
import { getConfigs, isDentAssistBridgeAvailable } from '@/services/dbService'
import { getPublicLicenseStatus, useLicenseStore } from '@/stores/licenseStore'
import { useSessionStore } from '@/stores/sessionStore'
import { ToastHost } from '@/components/ToastHost'
import { BrowserWrongLaunchScreen } from '@/components/BrowserWrongLaunchScreen'

const REMOTE_LICENSE_POLL_MS = 15 * 60 * 1000

export default function App() {
  const hydrated = useLicenseStore((s) => s.hydrated)
  const refresh = useLicenseStore((s) => s.refresh)
  const user = useSessionStore((s) => s.user)

  useEffect(() => {
    void (async () => {
      await refresh()
      try {
        if (!isDentAssistBridgeAvailable()) return
        const cfg = await getConfigs(['language', 'currency', 'exchange_rate'])
        const lng = cfg.language === 'en' ? 'en' : 'ar'
        await i18n.changeLanguage(lng)
        document.documentElement.lang = lng
        document.documentElement.setAttribute('dir', lng === 'ar' ? 'rtl' : 'ltr')
        
        // Load settings to store
        const { useSettingsStore } = await import('@/stores/settingsStore')
        useSettingsStore.getState().setSettings(
          cfg.currency || 'SYP',
          parseFloat(cfg.exchange_rate) || 1
        )
      } catch {
        /* keep default language */
      }
    })()
  }, [refresh])

  useEffect(() => {
    if (!hydrated || !isDentAssistBridgeAvailable()) return
    const tick = () => {
      void useLicenseStore.getState().refresh()
    }
    const id = window.setInterval(tick, REMOTE_LICENSE_POLL_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [hydrated])

  const isWebBuild = import.meta.env.VITE_TARGET === 'web'

  if (hydrated && import.meta.env.PROD && !isWebBuild && !isDentAssistBridgeAvailable()) {
    return (
      <NativeAppChrome>
        <BrowserWrongLaunchScreen />
      </NativeAppChrome>
    )
  }

  if (!hydrated) {
    return (
      <NativeAppChrome>
        <SplashScreen />
        <ToastHost />
      </NativeAppChrome>
    )
  }

  const status = getPublicLicenseStatus()

  if (status === 'locked') {
    return (
      <NativeAppChrome>
        <ActivationScreen />
        <ToastHost />
      </NativeAppChrome>
    )
  }

  if (!user) {
    return (
      <NativeAppChrome>
        {status === 'trial' ? <TrialBanner /> : null}
        <LoginScreen />
        <ToastHost />
      </NativeAppChrome>
    )
  }

  return (
    <NativeAppChrome>
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <LoggedInRoutes />
      </div>
      <ToastHost />
    </NativeAppChrome>
  )
}
