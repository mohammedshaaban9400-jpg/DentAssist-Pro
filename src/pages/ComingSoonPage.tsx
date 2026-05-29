import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'

export function ComingSoonPage() {
  const { t } = useTranslation()
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-teal-50 text-teal-600 mb-6">
        <Info className="size-10" />
      </div>
      <h1 className="text-2xl font-bold text-slate-800">{t('shell.comingSoon')}</h1>
      <p className="mt-2 text-slate-500 max-w-md">
        {t('shell.dashboardHint')}
      </p>
    </div>
  )
}
