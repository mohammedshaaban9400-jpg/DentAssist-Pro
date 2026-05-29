/**
 * Ensures web/PWA brand assets match the desktop app icon before `vite build` (web).
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const iconPng = path.join(root, 'build', 'icon.png')
const publicLogo = path.join(root, 'public', 'logo.png')
const publicFavicon = path.join(root, 'public', 'favicon.png')

async function syncFromBuildIcon() {
  if (!fs.existsSync(iconPng)) return false
  fs.copyFileSync(iconPng, publicLogo)
  await sharp(iconPng).resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(publicFavicon)
  console.log('[sync-web-public] Synced build/icon.png → public/logo.png & public/favicon.png')
  return true
}

const required = ['logo.png', 'favicon.png']
let ok = true
for (const name of required) {
  const p = path.join(root, 'public', name)
  if (!fs.existsSync(p)) {
    console.warn(`[sync-web-public] Missing public/${name}`)
    ok = false
  }
}

await syncFromBuildIcon()

if (!fs.existsSync(publicLogo)) {
  console.warn('[sync-web-public] Add build/icon.png or place logo.png in public/')
  ok = false
}

if (!ok) process.exit(1)
