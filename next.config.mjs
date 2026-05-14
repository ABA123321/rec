/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    /** 与 `npx tsc --noEmit` 对齐，避免静默放过类型错误 */
    ignoreBuildErrors: false,
  },
  experimental: {
    /** 树摇按需导入 lucide 图标，减轻 dev 编译体积与内存峰值 */
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
