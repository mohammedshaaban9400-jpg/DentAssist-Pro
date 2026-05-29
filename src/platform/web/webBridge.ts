import type { DentAssistApi } from '@/vite-env'
import { encryptBackupPayload } from '@/shared/backupFormat'
import {
  exportDatabaseBytes,
  handleWebDb,
  initSqlJsDatabase,
} from '@/platform/web/sqlJsDatabase'
import {
  listAssetPaths,
  mimeFromPath,
  putAsset,
  readAssetDataUrl,
} from '@/platform/web/assetStore'
import { getConfig } from '@/shared/db/core'
import { applyEncryptedBackupFile } from '@/platform/web/applyEncryptedBackup'
import { saveBackupBlob } from '@/platform/web/downloadBackupBlob'

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

async function collectAppFiles(): Promise<{ path: string; data: string }[]> {
  const paths = await listAssetPaths()
  const out: { path: string; data: string }[] = []
  for (const rel of paths) {
    try {
      const dataUrl = await readAssetDataUrl(rel)
      const comma = dataUrl.indexOf(',')
      const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : ''
      out.push({ path: rel, data: b64 })
    } catch {
      /* skip */
    }
  }
  return out
}

export function createWebBridge(): DentAssistApi {
  return {
    isElectronShell: false,
    getMachineId: async () => {
      await initSqlJsDatabase()
      return getConfig('machine_id') ?? ''
    },
    getPaths: async () => ({
      userData: 'dentassist-web',
      imagesDir: 'app_data/images',
      logosDir: 'app_data/logos',
      dbPath: 'dentassist.sqlite',
    }),
    db: (payload) => handleWebDb(payload),
    openExternal: async (url: string) => {
      if (!url.startsWith('https://') && !url.startsWith('http://') && !url.startsWith('whatsapp://')) {
        return false
      }
      window.open(url, '_blank', 'noopener,noreferrer')
      return true
    },
    saveClinicLogo: async (fileBuffer: ArrayBuffer, ext: string) => {
      const safeExt = ['png', 'jpg', 'jpeg', 'webp'].includes(ext.toLowerCase()) ? ext.toLowerCase() : 'png'
      const name = `clinic-logo.${safeExt === 'jpeg' ? 'jpg' : safeExt}`
      const rel = ['app_data', 'logos', name].join('/')
      await putAsset(rel, mimeFromPath(rel), fileBuffer)
      return rel
    },
    resolveAssetPath: async (relativePath: string) => relativePath,
    readUserDataFileBase64: async (relativePath: string) => {
      if (!relativePath.startsWith('app_data/')) throw new Error('Invalid asset path')
      return readAssetDataUrl(relativePath)
    },
    savePatientImage: async (patientId: number, fileBuffer: ArrayBuffer, ext: string) => {
      const safeExt = ['png', 'jpg', 'jpeg', 'webp'].includes(ext.toLowerCase()) ? ext.toLowerCase() : 'jpg'
      const extFile = safeExt === 'jpeg' ? 'jpg' : safeExt
      const name = `p${patientId}-${Date.now()}.${extFile}`
      const rel = ['app_data', 'images', name].join('/')
      await putAsset(rel, mimeFromPath(rel), fileBuffer)
      return rel
    },
    exportEncryptedBackup: async (passphrase: string) => {
      if (passphrase.length < 8) throw new Error('Backup passphrase must be at least 8 characters')
      await initSqlJsDatabase()
      const dbBytes = exportDatabaseBytes()
      const appFiles = await collectAppFiles()
      const enc = encryptBackupPayload(
        {
          v: 2,
          exportedAt: new Date().toISOString(),
          db: uint8ToBase64(dbBytes),
          appFiles,
        },
        passphrase,
      )
      const stamp = new Date().toISOString().slice(0, 10)
      const defaultName = `dentassist-backup-${stamp}.dentassist`
      return saveBackupBlob(enc, defaultName)
    },
    importEncryptedBackup: async (passphrase: string) => {
      return new Promise<{ ok: true } | { ok: false }>((resolve, reject) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.dentassist,application/octet-stream,*/*'
        input.onchange = async () => {
          const file = input.files?.[0]
          if (!file) {
            resolve({ ok: false })
            return
          }
          try {
            const enc = await file.text()
            await applyEncryptedBackupFile(enc, passphrase)
            resolve({ ok: true })
          } catch (e) {
            reject(e)
          }
        }
        input.click()
      })
    },
    importEncryptedBackupFromFile: async (file: File, passphrase: string) => {
      const enc = await file.text()
      await applyEncryptedBackupFile(enc, passphrase)
      return { ok: true as const }
    },
    saveTextFile: async (defaultFileName: string, content: string) => {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = defaultFileName.endsWith('.csv') ? defaultFileName : `${defaultFileName}.csv`
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      return { ok: true as const, filePath: a.download }
    },
    windowMinimize: async () => {},
    windowToggleMaximize: async () => ({ maximized: false }),
    windowClose: async () => {},
  }
}
