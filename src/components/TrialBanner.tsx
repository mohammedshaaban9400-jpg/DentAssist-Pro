import { differenceInDays, differenceInHours } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useLicenseStore } from '@/stores/licenseStore'

export function TrialBanner() {
  const { t } = useTranslation()
  const trialEndsAt = useLicenseStore((s) => s.trialEndsAt)
  if (!trialEndsAt) return null
  const now = new Date()
  const days = Math.max(0, differenceInDays(trialEndsAt, now))
  const hours = Math.max(0, differenceInHours(trialEndsAt, now) % 24)
  return (
    <div
      role="status"
      className="border-b border-amber-100 bg-amber-50 px-4 py-2.5 text-center text-sm font-medium text-amber-900"
    >
      {t('trial.banner', { days, hours })}
    </div>
  )
}
