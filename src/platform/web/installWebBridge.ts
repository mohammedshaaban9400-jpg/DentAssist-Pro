import { createWebBridge } from '@/platform/web/webBridge'
import { initSqlJsDatabase } from '@/platform/web/sqlJsDatabase'
import { setPatientImageDeletedHandler } from '@/shared/db/core'
import { deleteAsset } from '@/platform/web/assetStore'

let readyPromise: Promise<void> | null = null

export function isWebBridgeReady(): boolean {
  return typeof window !== 'undefined' && !!window.dentassist && window.dentassist.isElectronShell !== true
}

export function waitForWebBridge(): Promise<void> {
  if (readyPromise) return readyPromise
  readyPromise = (async () => {
    setPatientImageDeletedHandler((relativePath) => {
      void deleteAsset(relativePath)
    })
    await initSqlJsDatabase()
    if (!window.dentassist) {
      window.dentassist = createWebBridge()
    }
  })()
  return readyPromise
}

export async function installWebBridge(): Promise<void> {
  await waitForWebBridge()
}
