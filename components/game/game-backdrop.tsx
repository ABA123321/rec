import Image from "next/image"

/**
 * 全站游戏氛围背景（Web3 链游主题）：
 *  L1  场景全景图（深渊洞穴）—— object-cover 铺满，固定不滚动
 *  L2  顶/底部双向渐变蒙层 —— 保证文字可读
 *  L3  漂浮的金色符文阵 —— mix-blend-screen 让金色发光
 *  L4  六边形魔法网格 —— SVG mask，做"链游 UI"质感
 *  L5  双色径向辉光 —— 金（左上）+ 青（右下）
 *  L6  暗角 vignette
 *  L7  微动浮空光点 —— 5 颗，营造"魔法粒子"
 */
export function GameBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* L1 — 场景全景 */}
      <Image
        src="/site-bg-abyss.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-[0.45]"
      />

      {/* L2 — 主蒙层：顶部最深 → 中段半透 → 底部最深，让中间的符文可见 */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/55 to-background/95" />

      {/* L3 — 漂浮的金色符文阵（右侧），混合模式让它"亮起来" */}
      <div className="absolute -right-32 top-1/4 size-[44rem] opacity-[0.18] mix-blend-screen animate-[spin_120s_linear_infinite]">
        <Image
          src="/rune-pattern.jpg"
          alt=""
          fill
          sizes="44rem"
          className="object-contain"
        />
      </div>
      {/* 第二个反向旋转的符文圆（左下） */}
      <div className="absolute -left-40 bottom-0 size-[36rem] opacity-[0.12] mix-blend-screen animate-[spin_180s_linear_infinite_reverse]">
        <Image
          src="/rune-pattern.jpg"
          alt=""
          fill
          sizes="36rem"
          className="object-contain"
        />
      </div>

      {/* L4 — 六边魔法网格（CSS 实现，避免再生成图片） */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(60deg, oklch(0.8 0.15 80 / 0.6) 1px, transparent 1px),
            linear-gradient(-60deg, oklch(0.8 0.15 80 / 0.6) 1px, transparent 1px),
            linear-gradient(0deg, oklch(0.72 0.13 195 / 0.4) 1px, transparent 1px)
          `,
          backgroundSize: "56px 96px, 56px 96px, 56px 96px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      {/* L5 — 双色径向辉光 */}
      <div
        className="absolute -left-32 -top-40 size-[42rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.8 0.15 80 / 0.28) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-40 -right-32 size-[48rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.72 0.13 195 / 0.22) 0%, transparent 70%)",
        }}
      />
      {/* 中央的暗紫光晕，加深"深渊"感 */}
      <div
        className="absolute left-1/2 top-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.25 0.05 270 / 0.35) 0%, transparent 70%)",
        }}
      />

      {/* L6 — 左右 + 顶底 vignette */}
      <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-background/85 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-background/85 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background/70 to-transparent" />

      {/* L7 — 微动光点（5 颗） */}
      {[
        { top: "12%", left: "18%", delay: "0s", duration: "6s", color: "oklch(0.8 0.15 80)" },
        { top: "28%", left: "78%", delay: "1.2s", duration: "7s", color: "oklch(0.72 0.13 195)" },
        { top: "62%", left: "12%", delay: "2.4s", duration: "8s", color: "oklch(0.72 0.13 195)" },
        { top: "70%", left: "62%", delay: "0.6s", duration: "5s", color: "oklch(0.8 0.15 80)" },
        { top: "44%", left: "48%", delay: "3.6s", duration: "9s", color: "oklch(0.8 0.15 80)" },
      ].map((d, i) => (
        <span
          key={i}
          className="absolute size-1.5 rounded-full opacity-70 blur-[1px] animate-pulse"
          style={{
            top: d.top,
            left: d.left,
            background: d.color,
            boxShadow: `0 0 14px ${d.color}, 0 0 28px ${d.color}`,
            animationDelay: d.delay,
            animationDuration: d.duration,
          }}
        />
      ))}
    </div>
  )
}
