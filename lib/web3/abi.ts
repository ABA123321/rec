/**
 * Minimal ABIs (build-safe).
 *
 * We intentionally avoid importing Hardhat artifacts here because Next/Turbopack
 * can fail to resolve JSON outside the app root in production builds.
 *
 * Keep these ABIs minimal: only include the functions actually used by UISOL.
 * If you add new on-chain features, extend the relevant ABI below.
 */

// Minimal ERC20 ABI for USDT
export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
]

// AdventToken is an ERC20 used like a normal token.
export const ADVENT_ABI = ERC20_ABI

// ERC1155 Materials
export const MATERIALS_ABI = [
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function isApprovedForAll(address account, address operator) view returns (bool)",
  "function setApprovalForAll(address operator, bool approved)",
]

// Character NFT (ERC721-like + custom struct getter)
export const CHARACTER_NFT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function characters(uint256 tokenId) view returns (uint8 level, uint32 power)",
]

export const REFERRAL_REGISTRY_ABI = [
  "function referrerOf(address user) view returns (address)",
  "function bindReferrer(address referrer)",
  "function directCount(address account) view returns (uint32)",
  "function indirectCount(address account) view returns (uint32)",
  "function effectiveReferrers(address user) view returns (address direct, address indirect)",
]

export const STAMINA_ABI = [
  "function paused() view returns (bool)",
  "function stamina(address user) view returns (uint256)",
  "function claimedNewbieGift(address user) view returns (bool)",
  "function pricePerPoint() view returns (uint256)",
  "function buy(uint256 points)",
  "function claimNewbieGift()",
]

export const MARKETPLACE_ABI = [
  "function paused() view returns (bool)",
  "function nextOrderId() view returns (uint256)",
  "function orders(uint256 id) view returns (address seller, uint256 materialId, uint256 pricePerUnit, uint256 remaining, bool active)",
  "function getOrders(uint256[] ids) view returns (tuple(address seller,uint256 materialId,uint256 pricePerUnit,uint256 remaining,bool active)[] out)",
  "function getOrderPage(uint256 cursor,uint256 limit,uint256 materialId,bool onlyActive,uint256 maxScan) view returns (uint256 nextCursor,uint256[] ids,tuple(address seller,uint256 materialId,uint256 pricePerUnit,uint256 remaining,bool active)[] page)",
  "function createOrder(uint256 materialId, uint256 amount, uint256 pricePerUnit) returns (uint256 orderId)",
  "function buy(uint256 orderId, uint256 amount)",
  "function cancelOrderEvenIfPaused(uint256 orderId)",
]

export const GAME_ABI = [
  "function paused() view returns (bool)",
  "function drawnCount() view returns (uint256)",
  "function currentDrawPrice() view returns (uint256)",
  "function teamsOf(address user) view returns (tuple(uint256[3] characterIds, uint40 lastChallengeAt)[] teams)",
  "function pendingDraw(address user) view returns (uint8 count, uint40 requestBlock, bytes32 seedCommit, bool exists)",
  "function pendingSynthesis(address user) view returns (uint8 targetLevel, uint40 requestBlock, bytes32 seedCommit, bool exists)",
  "function requestDrawWithCommit(uint256 count, bytes32 seedCommit)",
  "function finalizeDrawWithSalt(bytes32 salt) returns (uint256 totalCost)",
  "function cancelDraw()",
  "function synthesisCost(uint8 targetLevel) view returns (uint256 ae, uint256 bf, uint256 mr, uint256 es, uint256 adventAmount)",
  "function requestSynthesizeWithCommit(uint8 targetLevel, bytes32 seedCommit)",
  "function finalizeSynthesizeWithSalt(bytes32 salt) returns (uint256 tokenId)",
  "function cancelSynthesis()",
  "function createTeam(uint256[3] characterIds) returns (uint256 teamIndex)",
  "function challenge(uint256 teamIndex, uint8 dungeonLevel)",
]

