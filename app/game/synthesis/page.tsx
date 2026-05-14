"use client"

import { ResponsiveGate } from "@/components/responsive-gate"
import { DesktopSynthesisPage } from "@/components/desktop/desktop-synthesis-page"
import { MobileSynthesisPage } from "@/components/mobile/mobile-synthesis-page"

export default function SynthesisPage() {
  return (
    <ResponsiveGate
      desktop={<DesktopSynthesisPage />}
      mobile={<MobileSynthesisPage />}
    />
  )
}
