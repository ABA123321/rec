import type { ReactNode } from "react"

import {
  GameMobileBottomNav,
  GameMobileBrandBar,
  GameSidebar,
} from "@/components/game/sidebar"

export default function GameLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen">
      <GameSidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <GameMobileBrandBar />
        {children}
      </div>
      <GameMobileBottomNav />
    </div>
  )
}
