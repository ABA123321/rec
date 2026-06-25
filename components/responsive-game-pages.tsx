"use client"

import dynamic from "next/dynamic"

import { ResponsiveGate } from "@/components/responsive-gate"

const DesktopHubPage = dynamic(() =>
  import("@/components/desktop/desktop-hub-page").then((m) => ({
    default: m.DesktopHubPage,
  })),
)
const MobileHubPage = dynamic(() =>
  import("@/components/mobile/mobile-hub-page").then((m) => ({
    default: m.MobileHubPage,
  })),
)

const DesktopSummonPage = dynamic(() =>
  import("@/components/desktop/desktop-summon-page").then((m) => ({
    default: m.DesktopSummonPage,
  })),
)
const MobileSummonPage = dynamic(() =>
  import("@/components/mobile/mobile-summon-page").then((m) => ({
    default: m.MobileSummonPage,
  })),
)

const DesktopTeamsPage = dynamic(() =>
  import("@/components/desktop/desktop-teams-page").then((m) => ({
    default: m.DesktopTeamsPage,
  })),
)
const MobileTeamsPage = dynamic(() =>
  import("@/components/mobile/mobile-teams-page").then((m) => ({
    default: m.MobileTeamsPage,
  })),
)

const DesktopSynthesisPage = dynamic(() =>
  import("@/components/desktop/desktop-synthesis-page").then((m) => ({
    default: m.DesktopSynthesisPage,
  })),
)
const MobileSynthesisPage = dynamic(() =>
  import("@/components/mobile/mobile-synthesis-page").then((m) => ({
    default: m.MobileSynthesisPage,
  })),
)

const DesktopDungeonsPage = dynamic(() =>
  import("@/components/desktop/desktop-dungeons-page").then((m) => ({
    default: m.DesktopDungeonsPage,
  })),
)
const MobileDungeonsPage = dynamic(() =>
  import("@/components/mobile/mobile-dungeons-page").then((m) => ({
    default: m.MobileDungeonsPage,
  })),
)

const DesktopMarketPage = dynamic(() =>
  import("@/components/desktop/desktop-market-page").then((m) => ({
    default: m.DesktopMarketPage,
  })),
)
const MobileMarketPage = dynamic(() =>
  import("@/components/mobile/mobile-market-page").then((m) => ({
    default: m.MobileMarketPage,
  })),
)

const DesktopReferralPage = dynamic(() =>
  import("@/components/desktop/desktop-referral-page").then((m) => ({
    default: m.DesktopReferralPage,
  })),
)
const MobileReferralPage = dynamic(() =>
  import("@/components/mobile/mobile-referral-page").then((m) => ({
    default: m.MobileReferralPage,
  })),
)

export function HubGamePage() {
  return <ResponsiveGate desktop={<DesktopHubPage />} mobile={<MobileHubPage />} />
}

export function SummonGamePage() {
  return (
    <ResponsiveGate desktop={<DesktopSummonPage />} mobile={<MobileSummonPage />} />
  )
}

export function TeamsGamePage() {
  return <ResponsiveGate desktop={<DesktopTeamsPage />} mobile={<MobileTeamsPage />} />
}

export function SynthesisGamePage() {
  return (
    <ResponsiveGate desktop={<DesktopSynthesisPage />} mobile={<MobileSynthesisPage />} />
  )
}

export function DungeonsGamePage() {
  return (
    <ResponsiveGate desktop={<DesktopDungeonsPage />} mobile={<MobileDungeonsPage />} />
  )
}

export function MarketGamePage() {
  return (
    <ResponsiveGate desktop={<DesktopMarketPage />} mobile={<MobileMarketPage />} />
  )
}

export function ReferralGamePage() {
  return (
    <ResponsiveGate desktop={<DesktopReferralPage />} mobile={<MobileReferralPage />} />
  )
}
