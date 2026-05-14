import { DesktopHubPage } from "@/components/desktop/desktop-hub-page"
import { MobileHubPage } from "@/components/mobile/mobile-hub-page"
import { ResponsiveGate } from "@/components/responsive-gate"

export default function DashboardPage() {
  return (
    <ResponsiveGate
      desktop={<DesktopHubPage />}
      mobile={<MobileHubPage />}
    />
  )
}
