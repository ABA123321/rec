"use client"

import { ResponsiveGate } from "@/components/responsive-gate"
import { DesktopSummonPage } from "@/components/desktop/desktop-summon-page"
import { MobileSummonPage } from "@/components/mobile/mobile-summon-page"

export default function SummonPage() {
  return (
    <ResponsiveGate
      desktop={<DesktopSummonPage />}
      mobile={<MobileSummonPage />}
    />
  )
}
