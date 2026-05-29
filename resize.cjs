const sharp = require('sharp')
const fs = require('fs')

async function resizeIcon() {
  const input = 'build/icon.png'
  if (!fs.existsSync(input)) {
    console.error('File not found')
    process.exit(1)
  }
  
  const temp = 'build/icon-temp.png'
  
  await sharp(input)
    .resize(256, 256, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .toFile(temp)
    
  fs.renameSync(temp, input)
  console.log('Icon resized to 256x256')
}

resizeIcon()
