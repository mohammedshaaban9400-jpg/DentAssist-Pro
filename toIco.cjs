/**
 * Build a multi-size Windows .ico so Explorer / shortcuts pick the right layer
 * (single-size ICO often shows the generic Electron icon on desktop).
 */
const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')
const pngToIco = require('png-to-ico').default

const input = 'build/icon.png'
const out = 'build/icon.ico'
/** Sizes Windows commonly expects inside an .ico */
const sizes = [16, 24, 32, 48, 64, 128, 256]

async function main() {
  if (!fs.existsSync(input)) {
    console.error(`Missing ${input}`)
    process.exit(1)
  }
  const tmpDir = path.join('build', '.ico-tmp')
  fs.mkdirSync(tmpDir, { recursive: true })
  const pngPaths = []
  try {
    for (const s of sizes) {
      const p = path.join(tmpDir, `icon-${s}.png`)
      await sharp(input)
        .resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(p)
      pngPaths.push(p)
    }
    const buf = await pngToIco(pngPaths)
    fs.writeFileSync(out, buf)
    console.log(`Wrote ${out} (${buf.length} bytes, ${sizes.join(',')} px)`)
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
