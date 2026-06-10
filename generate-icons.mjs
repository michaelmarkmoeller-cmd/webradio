// Kør med: node generate-icons.mjs
// Genererer PNG app-ikoner fra public/app-icon.svg via sharp
import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'

const svg = readFileSync('public/app-icon.svg')

mkdirSync('public/icons', { recursive: true })

const sizes = [
  { file: 'public/apple-touch-icon.png', size: 180 },
  { file: 'public/icons/icon-192.png',   size: 192 },
  { file: 'public/icons/icon-512.png',   size: 512 },
]

for (const { file, size } of sizes) {
  await sharp(svg).resize(size, size).png().toFile(file)
  console.log(`✓  ${file}  (${size}×${size})`)
}

console.log('\nFærdig.')
process.exit(0)
