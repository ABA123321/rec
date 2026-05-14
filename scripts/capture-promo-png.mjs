/**
 * 将固定尺寸海报 HTML 导出为 PNG（需本机 Chrome/Edge + dev 服务）。
 *
 * 用法（在 UISOL 目录）：
 *   npm run dev
 *   npm run promo:png
 *   npm run promo:png -- --only dungeon
 *
 * 环境变量：PROMO_BASE_URL、PROMO_SCALE、PUPPETEER_EXECUTABLE_PATH
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "node:fs"
import puppeteer from "puppeteer-core"

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
const outDir = path.join(repoRoot, "docs", "marketing-cn", "promo-exports")

const JOBS = [
  {
    path: "/promo/poster-mobile-full-dungeon-battle.html",
    w: 1080,
    h: 1920,
    file: "poster-mobile-full-dungeon-battle.png",
  },
  {
    path: "/promo/poster-mobile-full-project-ai.html",
    w: 1080,
    h: 1920,
    file: "poster-mobile-full-project-ai.png",
  },
]

function parseArgs() {
  const argv = process.argv.slice(2)
  let only = ""
  let base = process.env.PROMO_BASE_URL || "http://localhost:3000"
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--only" && argv[i + 1]) {
      only = argv[++i].toLowerCase()
    }
    if (argv[i] === "--base" && argv[i + 1]) {
      base = argv[++i].replace(/\/$/, "")
    }
  }
  return { only, base }
}

const scale = Math.max(1, Math.min(3, Number(process.env.PROMO_SCALE) || 2))

async function main() {
  const exe = resolveBrowserExecutable()
  if (!exe) {
    console.error(
      "未找到 Chrome / Edge。请安装浏览器或设置环境变量 PUPPETEER_EXECUTABLE_PATH。",
    )
    process.exit(1)
  }

  const { only, base } = parseArgs()
  const jobs = only
    ? JOBS.filter(
        (j) =>
          j.path.toLowerCase().includes(only) ||
          j.file.toLowerCase().includes(only),
      )
    : JOBS

  if (jobs.length === 0) {
    console.error("没有匹配的页面，请检查 --only 关键词。")
    process.exit(1)
  }

  fs.mkdirSync(outDir, { recursive: true })

  console.log("浏览器:", exe)
  console.log("基址:", base)
  console.log("导出目录:", outDir)
  console.log("deviceScaleFactor:", scale)

  const browser = await puppeteer.launch({
    executablePath: exe,
    headless: true,
    args: ["--font-render-hinting=none", "--disable-gpu", "--no-sandbox"],
  })

  try {
    for (const job of jobs) {
      const page = await browser.newPage()
      await page.setViewport({
        width: job.w,
        height: job.h,
        deviceScaleFactor: scale,
      })
      const url = `${base}${job.path}`
      console.log("加载:", url)
      try {
        await page.goto(url, { waitUntil: "networkidle0", timeout: 120_000 })
      } catch (e) {
        console.error(
          "\n无法打开页面。请确认已在 UISOL 目录运行 `npm run dev`。\n",
        )
        throw e
      }
      await page.evaluate(() => document.fonts.ready)
      await new Promise((r) => setTimeout(r, 600))
      const outPath = path.join(outDir, job.file)
      await page.screenshot({
        path: outPath,
        type: "png",
        clip: { x: 0, y: 0, width: job.w, height: job.h },
      })
      await page.close()
      console.log("已写入:", outPath)
    }
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
