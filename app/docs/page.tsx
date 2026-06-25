import type { Metadata } from "next"

import { UserGuideView } from "@/components/docs/user-guide-view"

export const metadata: Metadata = {
  title: "官方文档",
  description:
    "符文深渊 Rune Abyss — 玩法亮点、$草根社 与材料说明、Flap（蝴蝶平台）公平发射、操作步骤、AI 草根社【丝袜妹妹】介绍，以及白皮书 / 品牌叙事等 PDF 下载。具体以链上为准。",
  openGraph: {
    title: "官方文档 · Rune Abyss",
    description:
      "BSC 链游符文深渊 — 亮点、代币与操作说明；$草根社 于 Flap 公平发射。",
  },
}

export default function DocsPage() {
  return <UserGuideView />
}
