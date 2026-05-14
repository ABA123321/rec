/**
 * One-off: trim uniform white frame from public/materials/mr-moon-rune.jpg
 * Run: node scripts/trim-mr-moon-rune.mjs
 */
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const input = path.join(root, "public", "materials", "mr-moon-rune.jpg")
const backup = path.join(root, "public", "materials", "mr-moon-rune.pretrim-backup.jpg")

async function main() {
  const before = await sharp(input).metadata()
  console.log("before:", before.width, "x", before.height)

  await fs.copyFile(input, backup)
  console.log("backup:", path.relative(root, backup))

  const THRESHOLD = 38
  const buf = await sharp(input)
    .trim({ threshold: THRESHOLD })
    .jpeg({ quality: 93, mozjpeg: true })
    .toBuffer()

  const after = await sharp(buf).metadata()
  console.log("after:", after.width, "x", after.height, "(threshold=" + THRESHOLD + ")")

  if (after.width === before.width && after.height === before.height) {
    console.warn("trim had no effect; try raising threshold or check corner pixels")
  }

  await fs.writeFile(input, buf)
  console.log("wrote:", path.relative(root, input))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
