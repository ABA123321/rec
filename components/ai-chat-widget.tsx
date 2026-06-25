'use client'

import * as React from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Send, X, MessageCircle } from 'lucide-react'

import { GrassrootsTokenIcon } from '@/components/brand/grassroots-token-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export function ChatWidget() {
  const [open, setOpen] = React.useState(false)
  const [input, setInput] = React.useState('')

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || status === 'streaming') return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <>
      {/* 浮窗按钮 - 右下角 */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          // 移动端：抬到底部导航上方（导航 ≈ 56px + iPhone 安全区），留出 24px 间距
          // 桌面端（md+）：恢复原始 24px 偏移
          'fixed right-6 z-40 bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-6',
          'size-14 rounded-full shadow-lg transition-all duration-300',
          'flex items-center justify-center gap-2',
          'bg-gradient-to-br from-primary via-primary to-primary/80',
          'hover:scale-110 active:scale-95',
          'border border-primary/40 backdrop-blur-sm',
          "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-br before:from-cyan-400/20 before:to-transparent before:blur-lg before:-z-10"
        )}
        aria-label="打开聊天"
      >
        {/* 品牌Logo作为按钮图标 */}
        <div className="scale-90">
          <GrassrootsTokenIcon size={20} title={null} />
        </div>
        {/* 未读消息气泡 */}
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 size-5 rounded-full bg-chart-5 text-white text-[10px] font-bold flex items-center justify-center">
            {messages.filter((m) => m.role === 'assistant').length}
          </span>
        )}
      </button>

      {/* 聊天对话框 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-md p-0 gap-0 flex flex-col max-h-[600px]"
          aria-describedby={undefined}
        >
          {/* Header */}
          <DialogHeader className="border-b border-border bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 rounded-t-lg">
            <div className="flex items-center gap-2">
              <div className="scale-75">
                <GrassrootsTokenIcon size={20} title={null} />
              </div>
              <DialogTitle className="font-serif text-lg">草根社【丝袜妹妹】</DialogTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              关于游戏的任何疑问，尽管问我吧
            </p>
          </DialogHeader>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <MessageCircle className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  你好！我是草根社【丝袜妹妹】。
                  <br />
                  有任何关于游戏的问题吗？
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-2 animate-in fade-in slide-in-from-bottom-2',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-xs px-3 py-2 rounded-lg text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-muted text-foreground rounded-bl-none'
                    )}
                  >
                    {msg.parts
                      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                      .map((p) => p.text)
                      .join('')}
                  </div>
                </div>
              ))
            )}
            {status === 'streaming' && (
              <div className="flex gap-2 animate-in fade-in">
                <div className="bg-muted text-foreground rounded-lg rounded-bl-none px-3 py-2 flex gap-1">
                  <span className="inline-block size-2 rounded-full bg-foreground/40 animate-bounce" />
                  <span className="inline-block size-2 rounded-full bg-foreground/40 animate-bounce delay-100" />
                  <span className="inline-block size-2 rounded-full bg-foreground/40 animate-bounce delay-200" />
                </div>
              </div>
            )}
          </div>

          {/* 输入框 */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-border bg-background px-4 py-3 rounded-b-lg flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="问我点什么..."
              disabled={status === 'streaming'}
              className="flex-1 text-sm"
            />
            <Button
              type="submit"
              disabled={!input.trim() || status === 'streaming'}
              size="icon"
              className="size-9"
            >
              <Send className="size-4" aria-hidden />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
