/**
 * Google Drive Desktop Synchronization Service for DentAssist Pro
 * Integrates directly with the doctor's Google Drive local folder on their computer.
 * No developer keys or Google Cloud Console setup required!
 */

import {
  getEncryptedBackupString,
} from '@/services/dbService'

const STORAGE_FOLDER_KEY = 'dentassist_gdrive_folder_path'
const STORAGE_LAST_SYNC_KEY = 'dentassist_gdrive_last_sync'
const STORAGE_AUTO_SYNC_KEY = 'dentassist_gdrive_auto_sync'

export type DesktopBackupFile = {
  name: string
  path: string
  size: number
  createdTime: string
  modifiedTime?: string
}

/* ──────────────── Folder Preferences ──────────────── */

export function getSavedDriveFolderPath(): string | null {
  return localStorage.getItem(STORAGE_FOLDER_KEY)
}

export function setSavedDriveFolderPath(path: string | null): void {
  if (path) {
    localStorage.setItem(STORAGE_FOLDER_KEY, path.trim())
  } else {
    localStorage.removeItem(STORAGE_FOLDER_KEY)
  }
}

export function getLastDriveSyncTime(): string | null {
  return localStorage.getItem(STORAGE_LAST_SYNC_KEY)
}

export function setLastDriveSyncTime(iso: string): void {
  localStorage.setItem(STORAGE_LAST_SYNC_KEY, iso)
}

export function isAutoSyncEnabled(): boolean {
  return localStorage.getItem(STORAGE_AUTO_SYNC_KEY) === 'true'
}

export function setAutoSyncEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_AUTO_SYNC_KEY, enabled ? 'true' : 'false')
}

/* ──────────────── Detection & Folder Selection ──────────────── */

export async function detectSystemGoogleDriveFolder(): Promise<string | null> {
  const d = window.dentassist
  if (d?.detectGoogleDriveFolder) {
    try {
      const detected = await d.detectGoogleDriveFolder()
      if (detected) return detected
    } catch {
      /* ignore */
    }
  }
  return null
}

export async function selectGoogleDriveFolderDialog(): Promise<string | null> {
  const d = window.dentassist
  if (d?.selectFolderDialog) {
    return await d.selectFolderDialog()
  }

  // Web fallback using showDirectoryPicker if available in Chromium
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
      return handle.name || 'Google Drive'
    } catch {
      return null
    }
  }

  return null
}

/* ──────────────── Backup to Google Drive Folder ──────────────── */

export async function saveBackupToDriveFolder(
  folderPath: string,
  passphrase: string
): Promise<{ fileName: string; filePath: string; size: number }> {
  if (!passphrase || passphrase.length < 8) {
    throw new Error('كلمة مرور التشفير يجب ألا تقل عن 8 رموز.')
  }

  const d = window.dentassist
  if (d?.saveBackupToFolder) {
    const res = await d.saveBackupToFolder(folderPath, passphrase)
    setLastDriveSyncTime(new Date().toISOString())
    return {
      fileName: res.fileName,
      filePath: res.filePath,
      size: res.size,
    }
  }

  // Web environment fallback: generate encrypted payload and trigger file save
  const enc = await getEncryptedBackupString(passphrase)
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const defaultName = `dentassist-backup-${dateStr}.dentassist`

  if (d?.saveTextFile) {
    const res = await d.saveTextFile(defaultName, enc)
    if (!res.ok) throw new Error('تم إلغاء حفظ النسخة.')
    setLastDriveSyncTime(new Date().toISOString())
    return {
      fileName: defaultName,
      filePath: res.filePath,
      size: enc.length,
    }
  }

  // Fallback download for browser
  const blob = new Blob([enc], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = defaultName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)

  setLastDriveSyncTime(new Date().toISOString())
  return {
    fileName: defaultName,
    filePath: defaultName,
    size: enc.length,
  }
}

/* ──────────────── List Backups in Folder ──────────────── */

export async function listBackupsInDriveFolder(
  folderPath: string
): Promise<DesktopBackupFile[]> {
  const d = window.dentassist
  if (d?.listBackupsInFolder) {
    return await d.listBackupsInFolder(folderPath)
  }
  return []
}

/* ──────────────── Restore Backup ──────────────── */

export async function restoreBackupFromDriveFile(
  filePath: string,
  passphrase: string
): Promise<void> {
  if (!passphrase || passphrase.length < 8) {
    throw new Error('كلمة مرور فك التشفير يجب ألا تقل عن 8 رموز.')
  }

  const d = window.dentassist
  if (d?.restoreBackupFromFilePath) {
    await d.restoreBackupFromFilePath(filePath, passphrase)
    return
  }

  throw new Error('استعادة النسخ المباشرة من المسار غير مدعومة في هذه البيئة.')
}

/* ──────────────── Open Folder in Windows Explorer ──────────────── */

export async function openFolderInExplorer(folderPath: string): Promise<boolean> {
  const d = window.dentassist
  if (d?.openFolderInExplorer) {
    return await d.openFolderInExplorer(folderPath)
  }
  return false
}

/* ──────────────── Utilities ──────────────── */

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
