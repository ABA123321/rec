/**
 * 品牌叙事 / 一页纸 → PDF（与对外白皮书共用样式与本机 Chrome / Edge）。
 *
 * 用法（在 UISOL 目录）：
 *   npm run pdf:marketing:public              → 生成两份 PDF
 *   node scripts/build-marketing-pdf.mjs --doc narrative
 *   node scripts/build-marketing-pdf.mjs --doc onepager
 *   npm run pdf:marketing:public:en   → 品牌叙事 + 一页纸（英文 PDF）
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
const outDir = path.join(marketingDir, "promo-assets")
const cssPath = path.join(__dirname, "whitepaper-pdf-public.css")

const DOCS_ZH = {
  narrative: {
    md: "09-品牌叙事-对外发布版.md",
    pdf: "Rune-Abyss-品牌叙事.pdf",
    label: "品牌叙事",
  },
  onepager: {
    md: "10-一页纸-对外发布版.md",
    pdf: "Rune-Abyss-一页纸-投资生态.pdf",
    label: "一页纸（投资/生态）",
  },
}

const DOCS_EN = {
  narrative: {
    md: "09-brand-narrative-public-en.md",
    pdf: "Rune-Abyss-Brand-Narrative-Public-EN.pdf",
    label: "Brand narrative (EN)",
  },
  onepager: {
    md: "10-onepager-public-en.md",
    pdf: "Rune-Abyss-One-Pager-Invest-Ecosystem-Public-EN.pdf",
    label: "One-pager (EN)",
  },
}

function parseDocArg() {
  const i = process.argv.indexOf("--doc")
  if (i === -1 || !process.argv[i + 1]) return null
  const key = process.argv[i + 1].toLowerCase()
  if (key === "narrative" || key === "brand") return "narrative"
  if (key === "onepager" || key === "1pager" || key === "invest") return "onepager"
  console.error("未知 --doc 取值，请使用 narrative 或 onepager")
  process.exit(1)
}

const isEn = process.argv.includes("--en") || process.argv.includes("english")
const DOCS = isEn ? DOCS_EN : DOCS_ZH

const docArg = parseDocArg()
const keys = docArg ? [docArg] : ["narrative", "onepager"]

if (!fs.existsSync(cssPath)) {
  console.error("找不到样式表：", cssPath)
  process.exit(1)
}

const browser = resolveBrowserExecutable()
if (!browser) {
  console.error(
    "未找到 Chrome / Edge。请安装浏览器或设置环境变量 PUPPETEER_EXECUTABLE_PATH。",
  )
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

const pdfOptions = {
  format: "A4",
  margin: { top: "12mm", right: "12mm", bottom: "14mm", left: "12mm" },
  printBackground: true,
}

for (const k of keys) {
  const spec = DOCS[k]
  const mdPath = path.join(marketingDir, spec.md)
  const outPath = path.join(outDir, spec.pdf)
  if (!fs.existsSync(mdPath)) {
    console.error("找不到 Markdown：", mdPath)
    process.exit(1)
  }
  console.log("正在生成 PDF…", spec.label)
  console.log("  源文件:", mdPath)
  console.log("  浏览器:", browser)
  await mdToPdf(
    { path: mdPath },
    {
      dest: outPath,
      stylesheet: [cssPath],
      launch_options: { executablePath: browser, headless: "new" },
      pdf_options: pdfOptions,
    },
  )
  console.log("  已写入:", outPath)
  if (!isEn) {
    const webDir = path.join(uisolRoot, "public", "downloads")
    fs.mkdirSync(webDir, { recursive: true })
    const webPath = path.join(webDir, spec.pdf)
    fs.copyFileSync(outPath, webPath)
    console.log("  已同步官方文档下载目录:", webPath)
  }
}

console.log("完成。")
