"use client"

import { ResponsiveGate } from "@/components/responsive-gate"
import { DesktopDungeonsPage } from "@/components/desktop/desktop-dungeons-page"
import { MobileDungeonsPage } from "@/components/mobile/mobile-dungeons-page"

export default function DungeonsPage() {
  return (
    <ResponsiveGate
      desktop={<DesktopDungeonsPage />}
      mobile={<MobileDungeonsPage />}
    />
  )
}
