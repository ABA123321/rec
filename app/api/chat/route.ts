import { RUNE_SISTER_SYSTEM_PROMPT } from "@/lib/chatbot/ai-models"

export const runtime = "nodejs"

// Groq 模型映射 - 按品牌等级
const MODEL_MAP: Record<string, string> = {
  bronze: "llama-3.1-8b-instant",
  silver: "llama-3.3-70b-versatile",
  gold: "openai/gpt-oss-20b",
  legend: "openai/gpt-oss-120b",
}

/** 防止超大 JSON / 超长对话撑爆 Node 堆内存或 Groq 请求体 */
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

    // 智能提取 API key — 处理各种用户错填情况
    const rawApiKey = process.env.GROQ_API_KEY
    let apiKey = rawApiKey?.trim() || ""

    // 情况 1: 用户在值里输入了完整的 GROQ_API_KEY="gsk_xxx" 或 GROQ_API_KEY=gsk_xxx
    if (apiKey.includes("=")) {
      const eqIndex = apiKey.indexOf("=")
      apiKey = apiKey.substring(eqIndex + 1).trim()
    }

    // 情况 2: 移除前后包裹的引号（单引号或双引号）
    apiKey = apiKey.replace(/^["']|["']$/g, "").trim()

    const modelName = MODEL_MAP[modelTier] || MODEL_MAP.silver

    console.log("[v0] Chat API: modelTier", modelTier, "-> model", modelName)
    console.log(
      "[v0] Chat API: raw length",
      rawApiKey?.length,
      "extracted length",
      apiKey.length,
      "prefix",
      apiKey.substring(0, 8),
      "valid format",
      apiKey.startsWith("gsk_"),
    )

    // 没有 API Key，直接报错（不降级到本地）
    if (!apiKey) {
      console.error("[v0] Chat API: GROQ_API_KEY not set")
      return new Response(
        JSON.stringify({
          error: "Missing API key",
          message: "GROQ_API_KEY 环境变量未设置，请联系管理员配置",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // 直接调用 Groq REST API
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: RUNE_SISTER_SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    console.log("[v0] Chat API: Groq response status", groqResponse.status)

    // Groq 返回错误，把详细错误透传给前端，不降级
    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error("[v0] Chat API: Groq error body:", errorText)
      return new Response(
        JSON.stringify({
          error: "Groq API error",
          message: `Groq ${groqResponse.status}: ${errorText.substring(0, 300)}`,
        }),
        {
          status: groqResponse.status,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const data = await groqResponse.json()
    const text = data?.choices?.[0]?.message?.content || ""

    console.log("[v0] Chat API: response text length", text.length)

    if (!text.trim()) {
      console.error("[v0] Chat API: Groq returned empty content. Full data:", JSON.stringify(data).substring(0, 500))
      return new Response(
        JSON.stringify({
          error: "Empty response",
          message: "Groq 返回了空响应",
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
