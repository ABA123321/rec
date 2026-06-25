"use client"

import * as React from "react"
import { Send, Loader2, ChevronDown, Wallet } from "lucide-react"

import { useGame } from "@/components/providers/game-provider"
import { GrassrootsTokenIcon } from "@/components/brand/grassroots-token-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { RUNE_SISTER_MODELS, type RuneSisterModelId } from "@/lib/chatbot/ai-models"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

/** 防止会话数组无限增长导致前端内存与请求体膨胀 */
const MAX_CHAT_MESSAGES = 64

function capMessages(next: ChatMessage[]): ChatMessage[] {
  return next.length > MAX_CHAT_MESSAGES ? next.slice(-MAX_CHAT_MESSAGES) : next
}

export function ChatWidget() {
  const { connected } = useGame()
  const [open, setOpen] = React.useState(false)
  const [selectedModel, setSelectedModel] = React.useState<RuneSisterModelId>("silver")
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // 未连接钱包时禁止打开
  const handleOpenClick = React.useCallback(() => {
    if (!connected) {
      setError("请先连接钱包后再使用草根社【丝袜妹妹】")
      return
    }
    setOpen(true)
  }, [connected])

  // 自动滚到底部
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // 发送消息到 API
  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: input,
      }

      setMessages((prev) => capMessages([...prev, userMessage]))
      setInput("")
      setIsLoading(true)

      try {
        // 转换消息格式为 AI SDK 期望的格式
        const aiMessages = [...messages, userMessage].map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }))

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: aiMessages,
            modelTier: selectedModel,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `API error: ${response.status}`)
        }

        const assistantContent = await response.text()

        if (!assistantContent.trim()) {
          throw new Error("Empty response from AI")
        }

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: assistantContent,
        }

        setMessages((prev) => capMessages([...prev, assistantMessage]))
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "发送失败，请重试"
        setError(errorMsg)
        // 移除未成功获得回复的用户消息
        setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id))
      } finally {
        setIsLoading(false)
      }
    },
    [input, isLoading, messages, selectedModel],
  )

  // 获取当前模型信息
  const currentModel = RUNE_SISTER_MODELS.find((m) => m.id === selectedModel)

  return (
    <>
      {/* 浮窗按钮 — 品牌 Logo + 光晕 */}
      <button
        onClick={handleOpenClick}
        disabled={!connected}
        className={cn(
          "fixed z-50 flex size-14 items-center justify-center rounded-full",
          "max-md:bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] max-md:right-4",
          "md:bottom-6 md:right-6",
          "border border-primary/30 bg-background/80 backdrop-blur transition-all hover:scale-110 hover:border-primary/60",
          "shadow-lg hover:shadow-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          open && "scale-110 border-primary/60 shadow-primary/50",
          !connected && "cursor-not-allowed opacity-60 hover:scale-100",
        )}
        aria-label={connected ? "打开草根社【丝袜妹妹】聊天助手" : "请先连接钱包"}
        title={connected ? "草根社【丝袜妹妹】" : "需要连接钱包"}
      >
        {!connected ? (
          <Wallet className="size-6" />
        ) : (
          <>
            <div className="absolute inset-0 rounded-full opacity-20 blur-md" />
            <GrassrootsTokenIcon size={24} title={null} />
          </>
        )}
      </button>

      {/* 对话框 */}
      <Dialog open={open && connected} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="flex max-h-[600px] flex-col gap-0 p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GrassrootsTokenIcon size={20} title={null} />
                <div>
                  <DialogTitle className="font-serif">草根社【丝袜妹妹】</DialogTitle>
                  {currentModel && (
                    <DialogDescription className="text-xs">
                      {currentModel.icon} {currentModel.description}
                    </DialogDescription>
                  )}
                </div>
              </div>

              {/* 模型选择下拉菜单 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    disabled={isLoading}
                  >
                    <span className="hidden sm:inline">{currentModel?.name}</span>
                    <span className="sm:hidden">{currentModel?.icon}</span>
                    <ChevronDown className="size-3" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {RUNE_SISTER_MODELS.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={cn(
                        selectedModel === model.id && "bg-accent",
                      )}
                    >
                      <span className="mr-2">{model.icon}</span>
                      <span>{model.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogHeader>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {error && (
              <div className="mb-3 rounded-lg border border-chart-5/30 bg-chart-5/10 px-3 py-2 text-xs text-chart-5">
                {error}
              </div>
            )}
            {messages.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-center">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    你好呀！我是草根社【丝袜妹妹】 {currentModel?.icon}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    有关于符文深渊的问题吗？尽管问我吧！
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-2",
                      msg.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-xs rounded-lg px-3 py-2 text-sm leading-relaxed break-words",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-background/60",
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1 rounded-lg bg-background/60 px-3 py-2">
                      <Loader2 className="size-3 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        草根社【丝袜妹妹】思考中…
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* 输入框 */}
          <div className="border-t border-border px-6 py-3">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                placeholder="向草根社【丝袜妹妹】提问…"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  setError(null)
                }}
                disabled={isLoading}
                className="text-sm"
              />
              <Button
                size="sm"
                type="submit"
                disabled={isLoading || !input.trim()}
                className="gap-1.5"
              >
                {isLoading ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Send className="size-3.5" aria-hidden />
                )}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
