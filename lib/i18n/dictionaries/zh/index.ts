import type { DeepStringify } from "@/lib/i18n/messages-types"
import { common } from "./common"
import { docs } from "./docs"
import { game } from "./game"
import { hub } from "./hub"
import { landing } from "./landing"

export const zh = { common, docs, landing, hub, game } as const

export type Messages = DeepStringify<typeof zh>
