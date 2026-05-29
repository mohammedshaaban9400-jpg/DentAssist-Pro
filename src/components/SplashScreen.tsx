import { useTranslation } from 'react-i18next'
import { Stethoscope } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

export function SplashScreen() {
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0.01 : 0.35, ease: 'easeOut' }}
      className="relative flex h-full min-h-[320px] w-full flex-1 cursor-default flex-col items-center justify-center gap-6 overflow-hidden bg-slate-50 p-8 select-none"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reducedMotion ? 0.01 : 0.8, ease: 'easeOut' }}
      >
        <div className="absolute inset-x-[-20%] top-[-20%] h-56 rounded-full bg-teal-200/45 blur-3xl" />
        <div className="absolute bottom-[-20%] end-[-10%] h-56 w-72 rounded-full bg-cyan-200/35 blur-3xl" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 12 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        transition={{
          duration: reducedMotion ? 0.01 : 0.45,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="da-splash-pulse flex size-20 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-[0_8px_30px_-6px_rgba(13,148,136,0.45)]"
      >
        <Stethoscope className="size-10" />
      </motion.div>
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reducedMotion ? 0.01 : 0.4,
          ease: 'easeOut',
          delay: reducedMotion ? 0 : 0.1,
        }}
      >
        <p className="text-base font-semibold tracking-tight text-slate-900">{t('app.name')}</p>
        <p className="mt-1 text-xs font-medium text-slate-400">{t('shell.splashLoading')}</p>
      </motion.div>
    </motion.div>
  )
}
