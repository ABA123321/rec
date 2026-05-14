import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Cinzel } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { LocaleProvider } from "@/components/providers/locale-provider"
import { GameProvider } from "@/components/providers/game-provider"
import { GameBackdrop } from "@/components/game/game-backdrop"
import { ChatWidgetProvider } from "@/components/chat-widget-provider"
import { ReferralBindModal } from "@/components/referral-bind-modal"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-cinzel",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://runeas.xyz"),
  title: {
    default: "Rune Abyss · 符文深渊",
    template: "%s · Rune Abyss",
  },
  description:
    "BSC 链上零通胀链游 — 3 角色组队挑战副本，纯 USDT 内盘交易，材料合成稀有冒险者。",
  applicationName: "Rune Abyss",
  keywords: [
    "Rune Abyss",
    "符文深渊",
    "$REBC",
    "BSC",
    "Web3 Game",
    "GameFi",
    "零通胀",
    "链游",
  ],
  alternates: {
    canonical: "https://runeas.xyz",
  },
  openGraph: {
    type: "website",
    url: "https://runeas.xyz",
    siteName: "Rune Abyss",
    title: "Rune Abyss · 符文深渊",
    description:
      "BSC 链上零通胀链游 — 3 角色组队挑战副本，纯 USDT 内盘交易，材料合成稀有冒险者。",
    images: [
      {
        url: "/hero-rune-abyss.jpg",
        width: 1200,
        height: 630,
        alt: "Rune Abyss · 符文深渊",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rune Abyss · 符文深渊",
    description:
      "BSC 链上零通胀链游 — 3 角色组队挑战副本，纯 USDT 内盘交易，材料合成稀有冒险者。",
    images: ["/hero-rune-abyss.jpg"],
  },
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#0a0d12",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geist.variable} ${geistMono.variable} ${cinzel.variable} bg-background`}
      suppressHydrationWarning
    >
      <body
        className="relative font-sans antialiased min-h-screen text-foreground"
        suppressHydrationWarning
      >
        <GameBackdrop />
        <LocaleProvider>
          <GameProvider>
            <div className="relative z-10">{children}</div>
            <ChatWidgetProvider />
            <ReferralBindModal />
            <Toaster
              theme="dark"
              position="top-right"
              mobileOffset={{ top: "calc(env(safe-area-inset-top) + 56px)" }}
              offset={16}
              visibleToasts={3}
              duration={3500}
              closeButton
              toastOptions={{
                classNames: {
                  toast:
                    "group/toast pointer-events-auto border border-primary/30 bg-card/95 text-foreground shadow-[0_8px_30px_-12px_oklch(0.84_0.16_80/0.35)] backdrop-blur-xl",
                  title: "font-serif tracking-wide",
                  description: "text-muted-foreground text-xs leading-relaxed",
                  actionButton: "bg-primary text-primary-foreground",
                  cancelButton: "bg-muted text-muted-foreground",
                  closeButton:
                    "border-border bg-card/80 text-muted-foreground hover:text-foreground",
                  success: "border-chart-2/45 [&_[data-icon]]:text-chart-2",
                  error: "border-destructive/55 [&_[data-icon]]:text-destructive",
                  info: "border-chart-1/40 [&_[data-icon]]:text-chart-1",
                  warning: "border-chart-5/45 [&_[data-icon]]:text-chart-5",
                },
              }}
            />
          </GameProvider>
        </LocaleProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
