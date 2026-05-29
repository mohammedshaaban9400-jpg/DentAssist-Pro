/**
 * electron-builder skips embedding the app icon when `signAndEditExecutable` is false
 * (otherwise it would run rcedit through winCodeSign, which often fails on Windows without symlink privileges).
 * We patch the main .exe here with node-rcedit after ASAR integrity is already written.
 */
import path from 'node:path'
import fs from 'node:fs'
import { rcedit } from 'rcedit'

export default async function afterPackWinIcon(context) {
  if (context.electronPlatformName !== 'win32') return

  const projectDir = context.packager.projectDir
  const icon = path.join(projectDir, 'build', 'icon.ico')
  if (!fs.existsSync(icon)) {
    console.warn('[afterPack] build/icon.ico missing — run: npm run icons:win')
    return
  }

  const exeName = `${context.packager.appInfo.productFilename}.exe`
  const exe = path.join(context.appOutDir, exeName)
  if (!fs.existsSync(exe)) {
    console.warn('[afterPack] Executable not found:', exe)
    return
  }

  await rcedit(exe, { icon })
  console.log('[afterPack] Set Windows executable icon:', exeName)
}
