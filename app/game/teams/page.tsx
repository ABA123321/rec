"use client"

import { ResponsiveGate } from "@/components/responsive-gate"
import { DesktopTeamsPage } from "@/components/desktop/desktop-teams-page"
import { MobileTeamsPage } from "@/components/mobile/mobile-teams-page"

export default function TeamsPage() {
  return (
    <ResponsiveGate
      desktop={<DesktopTeamsPage />}
      mobile={<MobileTeamsPage />}
    />
  )
}
