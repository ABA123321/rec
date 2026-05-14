export const docs = {
  navAria: "文档目录",
  flapFairLaunch: "$REBC · Flap 公平发射",
  toc: {
    intro: "游戏概述",
    downloads: "资料下载",
    highlights: "核心亮点",
    tokens: "代币与资产",
    prepare: "上线准备",
    guide: "操作指南",
    ai: "AI · 符文妹妹",
    faq: "常见问题",
    contracts: "合约地址",
    help: "核对信息",
  },
  hero: {
    badge: "官方文档 · BSC 56",
    line1: "游戏介绍",
    line2: "与官方文档",
    lead: "面向玩家：快速理解 Rune Abyss（符文深渊）亮点、代币与基本操作。",
    leadEm: "具体数值以链上合约与游戏内展示为准。",
  },
  intro: {
    eyebrow: "Overview",
    title: "这是一款什么样的游戏？",
    p1a: "Rune Abyss（符文深渊）",
    p1b: "是部署在 BSC 上的 Web3 策略养成链游，核心循环：",
    loop: "组队 → 消耗体力挑战副本 → 获得材料 →（可选）USDT 内盘调剂库存 → 消耗材料与 $REBC 合成更高稀有度角色 → 继续远征。",
    p2a: "材料体系",
    zeroMint: "零增发",
    p2b: "：AE / BF / MR / ES 来自副本掉落或玩家市场交易，",
    p2c: "协议侧不会凭空铸造材料",
    p2d: "。",
  },
  downloads: {
    eyebrow: "Downloads",
    title: "深度资料（PDF）",
    lead: "以下为项目对外正文导出的 PDF，便于离线阅读与分享。",
    pdfs: [
      {
        title: "项目白皮书",
        desc: "机制、经济模型与规则说明（完整版）。",
      },
      {
        title: "品牌叙事",
        desc: "世界观、定位与对外主叙事。",
      },
      {
        title: "一页纸（投资 / 生态）",
        desc: "路演与生态一页通读摘要。",
      },
    ] as const,
  },
  highlights: {
    eyebrow: "Highlights",
    title: "核心亮点",
    flapLine: "Flap（蝴蝶平台）官网：",
    items: [
      {
        title: "链上真实资产",
        desc: "角色为 NFT，材料为 ERC1155，关键逻辑在链上执行；钱包即账号。",
      },
      {
        title: "经济约束清晰",
        desc: "$REBC 用于召唤与合成销毁；材料可通过 USDT 内盘流通，手续费规则公开透明。",
      },
      {
        title: "召唤公平性（可验证随机）",
        desc: "召唤 / 合成为 Commit-Reveal：先提交请求，经过若干区块后再揭晓，降低单区块操控风险。",
      },
      {
        title: "合成必成",
        desc: "满足链上公式则 100% 成功，材料与 $REBC 按规则销毁（黑洞），产出更高稀有角色。",
      },
      {
        title: "内盘交易灵活",
        desc: "市场支持 USDT 挂单、部分成交（手续费 {feePct}%，以链上为准）。",
      },
      {
        title: "推荐激励",
        desc: "可自助绑定推荐；体力与市场手续费按直推 {directPct}% / 间推 {indirectPct}% 规则分配（未绑定归项目配置）。",
      },
      {
        title: "AI 游戏助手",
        desc: "「符文妹妹」对话助手：玩法与操作指引；需连接钱包后使用（见下文说明）。",
      },
      {
        title: "代币公平发射",
        desc: "$REBC 通过 Flap（蝴蝶平台）公平发射，链上规则与流通以合约及平台为准。",
      },
    ] as const,
  },
  tokens: {
    eyebrow: "Assets",
    title: "代币与资产说明",
    adventTitle: "$REBC",
    advent1: "用于召唤与合成销毁；需按提示对 Game 合约完成 ERC20 授权（Approve）。",
    advent2: "总量设计约定 10 亿枚；以链上 totalSupply 为准。",
    advent3a: "公平发射：",
    advent3b: "Flap / 蝴蝶平台",
    advent3c: "；规则与时间以平台 Docs 与官方公告为准。",
    walletTitle: "USDT · 材料 · NFT",
    wallet1: "USDT：购买体力、市场买入材料；注意 Stamina / Marketplace 授权额度。",
    wallet2: "材料 AE/BF/MR/ES：副本掉落为主，也可 USDT 内盘购买。",
    wallet3a: "召唤单价基准约 {summonBase} $REBC，每约 1000 名阶梯上调（如 +10%）；全服代币召唤上限常见展示为 {cap}（合成不计入）。",
  },
  prepare: {
    eyebrow: "Before Start",
    title: "上线前准备",
    steps: [
      "安装支持 BSC 的钱包（MetaMask / OKX / TokenPocket 等）。",
      "切换到 BSC 主网（Chain ID 56）。",
      "准备少量 BNB 作 Gas；玩法需要 USDT 与 $REBC。",
      "仅通过官方域名打开游戏，谨防钓鱼。",
      "链上交易不可逆；价格波动有风险，请量力而行。",
    ] as const,
  },
  guide: {
    eyebrow: "How To Play",
    title: "操作指南（推荐顺序）",
    steps: [
      {
        title: "连接钱包",
        body: "打开站点 → 连接钱包 → 若提示则切换到 BSC。连接后可见缩短地址与余额。",
      },
      {
        title: "新手礼包与体力",
        body: "若开放新手礼包按提示领取。副本消耗体力；可用 USDT 购买（常见约 {energyPrice} USDT/点，以链上为准）。首次购买按需授权 USDT。",
      },
      {
        title: "符文召唤",
        body: "召唤页检查 $REBC 与授权 → 选择 1～10 抽。Commit-Reveal：提交请求 → 等待延迟区块 → 揭晓 Finalize（或超时 Cancel）。",
      },
      {
        title: "编成队伍",
        body: "每队 3 名不同角色；单账号最多 8 队；每队挑战后有冷却（常见约 24h，以链上为准）。",
      },
      {
        title: "挑战副本",
        body: "选择队伍与副本等级，满足战力门槛；成功通常全额掉落，失败通常约 1/4 掉落（以实现为准）。",
      },
      {
        title: "符文合成",
        body: "选择目标稀有度，备齐材料与 $REBC；100% 成功则销毁进入黑洞。若使用 Commit-Reveal，流程同召唤。",
      },
      {
        title: "内盘市场",
        body: "卖出需 ERC1155 授权 Marketplace；买入需 USDT 授权；支持部分购买；手续费含推荐分成（见 UI）。",
      },
      {
        title: "推荐绑定",
        body: "推荐页填写邀请地址或通过 ?ref= 预填。绑定通常仅一次；体力与市场手续费按规则分成。",
      },
    ] as const,
    linkSummon: "召唤",
    linkTeams: "队伍",
    linkDungeons: "副本",
    linkMarket: "市场",
  },
  ai: {
    eyebrow: "AI Layer",
    title: "符文妹妹 · AI 应用层",
    whatTitle: "能帮你做什么？",
    bullets: [
      "解释菜单含义、Commit-Reveal 流程、授权按钮、材料缩写等玩法与操作。",
      "入口为界面中的聊天组件；通常需先连接钱包后再对话。",
      "可在客户端切换不同模型（名称以 UI 为准）。",
    ] as const,
    warnTitle: "重要：",
    warnBody:
      "AI 生成内容可能有疏漏。余额、授权、Gas、交易是否成功请以钱包与区块链浏览器为准；",
    warnTail: "不构成投资建议。",
  },
  faq: {
    eyebrow: "FAQ",
    title: "常见问题",
    items: [
      {
        q: "为什么点了召唤没有立刻出结果？",
        a: "可能为 Commit-Reveal：需在延迟区块后点击 Finalize 揭晓。",
      },
      { q: "材料会通胀吗？", a: "材料来自副本与市场，不由协议无限增发。" },
      {
        q: "$REBC 从哪里买？",
        a: "关注 Flap（https://flap.sh/）上公平发射与交易规则，核对官方合约地址；谨防仿冒域名。",
      },
      {
        q: "手机能玩吗？",
        a: "若前端为响应式或通过钱包内置浏览器访问官方 HTTPS 链接即可。",
      },
    ] as const,
  },
  contracts: {
    eyebrow: "On-chain",
    title: "链上合约地址",
    chainId: "Chain ID",
    rows: {
      Game: "召唤、副本、组队、合成等核心逻辑",
      CharacterNFT: "冒险者角色 ERC721",
      Materials: "副本材料 ERC1155（AE / BF / MR / ES）",
      Marketplace: "材料 USDT 内盘挂单与成交",
      AdventToken: "游戏代币 ERC20",
      USDT: "体力购买与内盘计价（BSC 常见质押 USDT）",
      Stamina: "体力合约",
      ReferralRegistry: "推荐关系绑定",
    },
  },
  help: {
    eyebrow: "Verify",
    title: "获取帮助与核对",
    body: "请在区块浏览器核对上述合约与您的交易回执。Gas、价格阶梯、手续费等参数如有变更，",
    bodyEm: "一律以链上当前读数为准",
    bodyEnd: "。",
  },
} as const
