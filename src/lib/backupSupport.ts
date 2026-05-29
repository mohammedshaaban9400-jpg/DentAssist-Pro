/** Encrypted .dentassist export/import (desktop Electron + web/PWA). */
export function supportsEncryptedBackup(): boolean {
  const d = window.dentassist
  return !!d?.exportEncryptedBackup && !!d?.importEncryptedBackup
}

export function isWebAppBuild(): boolean {
  return import.meta.env.VITE_TARGET === 'web'
}
