import CryptoJS from 'crypto-js'

export type BackupAppFile = { path: string; data: string }

export type BackupPayload = {
  v: number
  exportedAt?: string
  data?: string
  db?: string
  appFiles?: BackupAppFile[]
}

export function encryptBackupPayload(payload: BackupPayload, passphrase: string): string {
  return CryptoJS.AES.encrypt(JSON.stringify(payload), passphrase).toString()
}

export function decryptBackupPayload(encrypted: string, passphrase: string): BackupPayload {
  if (passphrase.length < 8) {
    throw new Error('Backup passphrase must be at least 8 characters')
  }
  const bytes = CryptoJS.AES.decrypt(encrypted, passphrase)
  const decrypted = bytes.toString(CryptoJS.enc.Utf8)
  if (!decrypted) {
    throw new Error('wrong passphrase or corrupted file')
  }
  const payload = JSON.parse(decrypted) as BackupPayload
  if (payload.v !== 1 && payload.v !== 2) {
    throw new Error('Unsupported backup format')
  }
  return payload
}

export function databaseBytesFromPayload(payload: BackupPayload): Uint8Array {
  const dbBase64 = payload.v === 2 ? payload.db : payload.data
  if (typeof dbBase64 !== 'string') {
    throw new Error('Invalid backup database')
  }
  const binary = atob(dbBase64)
  const buf = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
  return buf
}
