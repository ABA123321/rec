"use client"

import { ResponsiveGate } from "@/components/responsive-gate"
import { DesktopMarketPage } from "@/components/desktop/desktop-market-page"
import { MobileMarketPage } from "@/components/mobile/mobile-market-page"

export default function MarketPage() {
  return (
    <ResponsiveGate
      desktop={<DesktopMarketPage />}
      mobile={<MobileMarketPage />}
    />
  )
}
