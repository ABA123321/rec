"use client"

import { ResponsiveGate } from "@/components/responsive-gate"
import { DesktopReferralPage } from "@/components/desktop/desktop-referral-page"
import { MobileReferralPage } from "@/components/mobile/mobile-referral-page"

export default function ReferralPage() {
  return (
    <ResponsiveGate
      desktop={<DesktopReferralPage />}
      mobile={<MobileReferralPage />}
    />
  )
}
