import { isAfter } from 'date-fns'
import { create } from 'zustand'
import i18n from '@/i18n'
import { checkRemoteLicenseActive } from '@/lib/licenseRemoteVerify'
import { computeTrialEndsAt } from '@/lib/trialDuration'
import {
  fetchLicenseProbe,
  isClockSkewed,
  LICENSE_CLOCK_SKEW_MS,
} from '@/lib/supabaseLicenseProbe'
import { getSupabase } from '@/lib/supabaseClient'
import { getConfigs, getMachineId, isDentAssistBridgeAvailable, setConfig } from '@/services/dbService'
import { useSessionStore } from '@/stores/sessionStore'
import { useToastStore } from '@/stores/toastStore'

export type PublicLicenseStatus = 'trial' | 'active' | 'locked'

/** Blocks use (activation screen) without necessarily writing `inactive` to the local DB. */
export type LicenseGate = null | 'clock_skew' | 'probe_offline'

type LicenseState = {
  hydrated: boolean
  machineId: string
  licenseStatus: 'trial' | 'active' | 'inactive'
  firstLaunchIso: string | null
  trialEndsAt: Date | null
  /** When non-null, activation screen shows this i18n key instead of the default trial message. */
  activationHintKey: string | null
  licenseGate: LicenseGate
  refresh: () => Promise<void>
}

function publicStatus(
  licenseStatus: LicenseState['licenseStatus'],
  trialEndsAt: Date | null,
  licenseGate: LicenseGate,
): PublicLicenseStatus {
  if (licenseGate === 'clock_skew' || licenseGate === 'probe_offline') return 'locked'
  if (licenseStatus === 'active') return 'active'
  if (licenseStatus === 'trial' && trialEndsAt && isAfter(trialEndsAt, new Date())) return 'trial'
  return 'locked'
}

export const useLicenseStore = create<LicenseState>((set) => ({
  hydrated: false,
  machineId: '',
  licenseStatus: 'inactive',
  firstLaunchIso: null,
  trialEndsAt: null,
  activationHintKey: null,
  licenseGate: null,
  refresh: async () => {
    if (!isDentAssistBridgeAvailable()) {
      set({
        hydrated: true,
        machineId: '',
        licenseStatus: 'active',
        firstLaunchIso: null,
        trialEndsAt: null,
        activationHintKey: null,
        licenseGate: null,
      })
      return
    }
    const machineId = await getMachineId()
    const cfg = await getConfigs(['license_status', 'first_launch_date'])
    let licenseStatus = (cfg.license_status ?? 'trial') as LicenseState['licenseStatus']
    const first = cfg.first_launch_date ?? null
    let trialEndsAt: Date | null = null
    if (first) {
      trialEndsAt = computeTrialEndsAt(new Date(first))
    }

    // Re-open trial when duration was extended and first launch is still inside the new window.
    if (licenseStatus === 'inactive' && trialEndsAt && isAfter(trialEndsAt, new Date())) {
      licenseStatus = 'trial'
      await setConfig('license_status', 'trial')
    }

    if (licenseStatus === 'trial' && trialEndsAt && isAfter(new Date(), trialEndsAt)) {
      licenseStatus = 'inactive'
      await setConfig('license_status', 'inactive')
    }

    let licenseGate: LicenseGate = null
    let activationHintKey: string | null = null
    let serverNowIso: string | undefined
    const prevGate = useLicenseStore.getState().licenseGate

    const supabase = getSupabase()
    if (supabase && machineId.trim()) {
      const probe = await fetchLicenseProbe(machineId, first)
      if (!probe.ok) {
        if (licenseStatus === 'trial') {
          licenseGate = 'probe_offline'
          activationHintKey = 'license.probeFailed'
          if (prevGate !== 'probe_offline') {
            useToastStore.getState().push(i18n.t('license.probeFailed'), 'error')
          }
        }
      } else {
        serverNowIso = new Date(probe.serverNowMs).toISOString()
        if (isClockSkewed(probe.serverNowMs, Date.now(), LICENSE_CLOCK_SKEW_MS)) {
          licenseGate = 'clock_skew'
          activationHintKey = 'license.clockSkew'
          if (prevGate !== 'clock_skew') {
            useToastStore.getState().push(i18n.t('license.clockSkew'), 'error')
          }
          if (licenseStatus === 'trial') {
            licenseStatus = 'inactive'
            await setConfig('license_status', 'inactive')
          } else {
            useSessionStore.getState().setUser(null)
          }
        } else if (licenseStatus === 'trial') {
          trialEndsAt = new Date(probe.trialEndsAtMs)
          if (!probe.trialValid) {
            licenseStatus = 'inactive'
            await setConfig('license_status', 'inactive')
          }
        }
      }
    }

    if (licenseStatus === 'active' && !licenseGate) {
      const remote = await checkRemoteLicenseActive(machineId, serverNowIso)
      if (remote === 'inactive') {
        await setConfig('license_status', 'inactive')
        licenseStatus = 'inactive'
        useSessionStore.getState().setUser(null)
        useToastStore.getState().push(i18n.t('license.revokedRemote'), 'error')
      }
    }

    set({
      hydrated: true,
      machineId,
      licenseStatus,
      firstLaunchIso: first,
      trialEndsAt,
      activationHintKey,
      licenseGate,
    })
  },
}))

export function getPublicLicenseStatus(): PublicLicenseStatus {
  const st = useLicenseStore.getState()
  return publicStatus(st.licenseStatus, st.trialEndsAt, st.licenseGate)
}
