import { addDays, addMonths } from 'date-fns'

/** Trial length: two and a half months (2 months + 15 days) from first launch. */
export function computeTrialEndsAt(firstLaunch: Date): Date {
  return addDays(addMonths(firstLaunch, 2), 15)
}

/** Postgres interval literal for `app_license_probe` (keep in sync). */
export const TRIAL_INTERVAL_SQL = "interval '2 months 15 days'"
