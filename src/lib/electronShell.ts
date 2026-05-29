/** True when running inside the real Electron shell (custom title bar, window IPC). */
export function isElectronShell(): boolean {
  return typeof window !== 'undefined' && window.dentassist?.isElectronShell === true
}

/** Show desktop-style top chrome (custom title strip) in Electron only. */
export function showDesktopWindowChrome(): boolean {
  return isElectronShell()
}
