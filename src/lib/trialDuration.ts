import { addDays } from 'date-fns'

/** Trial length: 7 days from first launch. */
export function computeTrialEndsAt(firstLaunch: Date): Date {
  return addDays(firstLaunch, 7)
}

/** Postgres interval literal for `app_license_probe` (keep in sync). */
export const TRIAL_INTERVAL_SQL = "interval '7 days'"
