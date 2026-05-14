/**
 * Markdown → PDF（使用本机 Chrome / Edge）。
 *
 * 用法（在 UISOL 目录）：
 *   npm run pdf:whitepaper          → 精简版 05 → Rune-Abyss-白皮书-对外版.pdf
 *   npm run pdf:whitepaper:public   → 对外正文 08 → Rune-Abyss-白皮书.pdf（并同步 UISOL/public/downloads/）
 *   npm run pdf:whitepaper:public:en → 英文对外版 → Rune-Abyss-White-Paper-Public-EN.pdf
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "node:fs"
import { mdToPdf } from "md-to-pdf"

function resolveBrowserExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH
  }
  if (process.platform === "win32") {
    const candidates = [
      process.env.LOCALAPPDATA
        ? path.join(
            process.env.LOCALAPPDATA,
            "Google",
            "Chrome",
            "Application",
            "chrome.exe",
          )
        : "",
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ].filter(Boolean)
    for (const p of candidates) {
      if (fs.existsSync(p)) return p
    }
  }
  if (process.platform === "darwin") {
    const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    if (fs.existsSync(mac)) return mac
  }
  if (process.platform === "linux") {
    for (const p of [
      "/usr/bin/google-chrome-stable",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
    ]) {
      if (fs.existsSync(p)) return p
    }
  }
  return undefined
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uisolRoot = path.join(__dirname, "..")
const repoRoot = path.join(uisolRoot, "..")
const marketingDir = path.join(repoRoot, "docs", "marketing-cn")

const isPublic =
  process.argv.includes("--public") || process.argv.includes("public")
const isEn = process.argv.includes("--en") || process.argv.includes("english")

if (isEn && !isPublic) {
  console.error("参数错误：--en 仅与 --public 联用（英文对外白皮书）。")
  process.exit(1)
}

const mdFile =
  isPublic && isEn
    ? "08-whitepaper-public-en.md"
    : isPublic
      ? "08-白皮书-对外发布版.md"
      : "05-白皮书-精简版.md"
const pdfFile =
  isPublic && isEn
    ? "Rune-Abyss-White-Paper-Public-EN.pdf"
    : isPublic
      ? "Rune-Abyss-白皮书.pdf"
      : "Rune-Abyss-白皮书-对外版.pdf"

const mdPath = path.join(marketingDir, mdFile)
const outDir = path.join(marketingDir, "promo-assets")
const outPath = path.join(outDir, pdfFile)
const cssPath = path.join(
  __dirname,
  isPublic ? "whitepaper-pdf-public.css" : "whitepaper-pdf.css",
)

if (!fs.existsSync(mdPath)) {
  console.error("找不到 Markdown：", mdPath)
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

const browser = resolveBrowserExecutable()
if (!browser) {
  console.error(
    "未找到 Chrome / Edge。请安装浏览器或设置环境变量 PUPPETEER_EXECUTABLE_PATH。",
  )
  process.exit(1)
}

console.log("正在生成 PDF…")
console.log(
  "  模式:",
  isPublic && isEn
    ? "对外正文（英文）"
    : isPublic
      ? "对外正文（中文）"
      : "精简版",
)
console.log("  源文件:", mdPath)
console.log("  浏览器:", browser)

const pdfOptions = isPublic
  ? {
      format: "A4",
      margin: { top: "12mm", right: "12mm", bottom: "14mm", left: "12mm" },
      printBackground: true,
    }
  : {
      format: "A4",
      margin: { top: "18mm", right: "16mm", bottom: "18mm", left: "16mm" },
      printBackground: true,
    }

await mdToPdf(
  { path: mdPath },
  {
    dest: outPath,
    stylesheet: [cssPath],
    launch_options: { executablePath: browser, headless: "new" },
    pdf_options: pdfOptions,
  },
)

console.log("已写入:", outPath)

if (isPublic && !isEn) {
  const webDir = path.join(uisolRoot, "public", "downloads")
  fs.mkdirSync(webDir, { recursive: true })
  const webPath = path.join(webDir, pdfFile)
  fs.copyFileSync(outPath, webPath)
  console.log("已同步官方文档下载目录:", webPath)
}
