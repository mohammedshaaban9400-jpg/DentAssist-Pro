import {
  databaseBytesFromPayload,
  decryptBackupPayload,
  type BackupAppFile,
} from '@/shared/backupFormat'
import { importDatabaseBytes } from '@/platform/web/sqlJsDatabase'
import { clearAssets, mimeFromPath, restoreAssets } from '@/platform/web/assetStore'

export async function applyEncryptedBackupFile(
  encrypted: string,
  passphrase: string,
): Promise<void> {
  const payload = decryptBackupPayload(encrypted, passphrase)
  const dbBytes = databaseBytesFromPayload(payload)
  await importDatabaseBytes(dbBytes)
  if (payload.v === 2 && Array.isArray(payload.appFiles)) {
    await restoreAssets(payload.appFiles as BackupAppFile[], mimeFromPath)
  } else {
    await clearAssets()
  }
}
