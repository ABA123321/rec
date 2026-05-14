"use client"

/**
 * 首页底部：常用钱包与行情 / 链上查询入口（第三方站点，仅导航用途）。
 * 图标均为本地静态资源（`public/ecosystem/` 下 .svg / .png / .ico），不依赖外网。
 */

import { useLocale } from "@/components/providers/locale-provider"

const ECOSYSTEM_LINKS = [
  {
    label: "MetaMask",
    href: "https://metamask.io/download/",
    iconSrc: "/ecosystem/metamask.svg",
  },
  {
    label: "WalletConnect",
    href: "https://walletconnect.com/",
    iconSrc: "/ecosystem/walletconnect.svg",
  },
  {
    label: "Trust Wallet",
    href: "https://trustwallet.com/",
    iconSrc: "/ecosystem/trustwallet.svg",
  },
  {
    label: "CoinGecko",
    href: "https://www.coingecko.com/",
    iconSrc: "/ecosystem/coingecko.svg",
  },
  {
    label: "CoinMarketCap",
    href: "https://coinmarketcap.com/",
    iconSrc: "/ecosystem/coinmarketcap.svg",
  },
  {
    label: "BscScan",
    href: "https://bscscan.com/",
    iconSrc: "/ecosystem/bscscan.ico",
  },
  {
    label: "DexScreener",
    href: "https://dexscreener.com/bsc",
    iconSrc: "/ecosystem/dexscreener.png",
  },
  {
    label: "BNB Chain",
    href: "https://www.bnbchain.org/",
    iconSrc: "/ecosystem/bnbchain.svg",
  },
] as const

export function LandingEcosystemStrip() {
  const { messages: m } = useLocale()
  const L = m.landing
  return (
    <section
      aria-labelledby="landing-ecosystem-heading"
      className="border-t border-border bg-card/25"
    >
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-12">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {L.ecosystemEyebrow}
        </p>
        <h2
          id="landing-ecosystem-heading"
          className="mt-2 text-center font-serif text-xl text-balance text-foreground sm:text-2xl"
        >
          {L.ecosystemTitle}
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          {L.ecosystemLead}
        </p>

        <ul className="mt-8 flex list-none flex-wrap items-start justify-center gap-x-8 gap-y-8 sm:gap-x-10">
          {ECOSYSTEM_LINKS.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-[4.5rem] flex-col items-center gap-2 sm:w-[5rem]"
                aria-label={`${item.label} ${L.openInNewTab}`}
              >
                <span className="flex size-12 items-center justify-center rounded-xl border border-border/70 bg-background/60 p-2 shadow-sm transition group-hover:border-primary/45 group-hover:bg-primary/8">
                  <img
                    src={item.iconSrc}
                    alt=""
                    width={28}
                    height={28}
                    className="object-contain opacity-90 transition group-hover:opacity-100"
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className="text-center text-[10px] leading-tight text-muted-foreground transition group-hover:text-foreground sm:text-[11px]">
                  {item.label}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
