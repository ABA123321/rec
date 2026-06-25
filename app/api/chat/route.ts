import { generateText } from "ai"
import { RUNE_SISTER_SYSTEM_PROMPT } from "@/lib/chatbot/ai-models"

export const runtime = "nodejs"

// 通过 Vercel AI Gateway 访问模型 - 按品牌等级映射（无需手动维护 GROQ_API_KEY）
const MODEL_MAP: Record<string, string> = {
  bronze: "meta/llama-3.1-8b",
  silver: "meta/llama-3.3-70b",
  gold: "openai/gpt-oss-20b",
  legend: "openai/gpt-oss-120b",
}

/** 防止超大 JSON / 超长对话撑爆 Node 堆内存或模型请求体 */
const MAX_MESSAGES = 80
const MAX_MESSAGE_CHARS = 16_000
const MAX_BODY_BYTES = 600_000

export async function POST(request: Request) {
  try {
    const len = request.headers.get("content-length")
    if (len && Number(len) > MAX_BODY_BYTES) {
      return new Response(
        JSON.stringify({
          error: "Payload too large",
          message: "请求体过大，请缩短对话或新开会话",
        }),
        { status: 413, headers: { "Content-Type": "application/json" } },
      )
    }

    const { messages, modelTier = "silver" } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid messages", message: "请求格式错误" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    if (messages.length > MAX_MESSAGES) {
      return new Response(
        JSON.stringify({
          error: "Too many messages",
          message: `对话条数超过上限（${MAX_MESSAGES}），请新开会话`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    for (const m of messages) {
      const c = m?.content
      if (typeof c !== "string" || c.length > MAX_MESSAGE_CHARS) {
        return new Response(
          JSON.stringify({
            error: "Message too long",
            message: `单条消息过长（>${MAX_MESSAGE_CHARS} 字符）`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        )
      }
    }

    const modelName = MODEL_MAP[modelTier] || MODEL_MAP.silver

    console.log("[v0] Chat API: modelTier", modelTier, "-> model", modelName)

    // 通过 Vercel AI Gateway 调用模型（无需手动配置 API Key）
    const { text } = await generateText({
      model: modelName,
      system: RUNE_SISTER_SYSTEM_PROMPT,
      messages,
      temperature: 0.7,
      maxOutputTokens: 1024,
    })

    console.log("[v0] Chat API: response text length", text.length)

    if (!text.trim()) {
      console.error("[v0] Chat API: model returned empty content")
      return new Response(
        JSON.stringify({
          error: "Empty response",
          message: "模型返回了空响应",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  } catch (error) {
    console.error("[v0] Chat API: unhandled error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
