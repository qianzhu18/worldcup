# PitchOdds · 世界杯预测市场聚合站

聚合 **Polymarket / 币安 / OKX** 的 2026 世界杯预测盘口，提供热度排行、跨平台价差雷达、
自研胜率模型，以及赛程时间线、比赛详情、球队 / 球员资料。视觉走「世界杯热血风」
（球场绿 + 夺金黄 + 国旗色）。

## 快速开始

```bash
pnpm install
pnpm dev          # 开发，http://localhost:3000
pnpm build && pnpm start   # 生产
```

## 技术栈

- **Next.js 14**（App Router，服务端组件直接拉数据并缓存）
- **TypeScript + Tailwind CSS**（自定义热血主题）
- 图表用**纯 SVG**（雷达图 / 概率条），无重型依赖

## 目录结构

```
app/
  page.tsx              首页：Hero+倒计时 / 价值雷达 / 热度榜 / 跨平台价差 / 夺冠模型
  timeline/             赛程时间线（按日分组的纵向时间轴）
  match/[id]/           比赛详情：模型胜率 / 泊松比分预测 / H2H / 双方核心球员
  teams/ · team/[code]/ 分组总览 / 球队详情（阵容·赛程·近期状态）
  players/ · player/[id]/ 球星中心 / 球员详情（打法雷达·评分·数据）
lib/
  polymarket.ts   Polymarket Gamma API 客户端 + 热度算法 + 价差/价值雷达
  worldcup.ts     球队 / 分组 / 赛程 / H2H 数据集
  players.ts      球星数据（照片·属性·评分）
  model.ts        Elo 胜率模型（1X2 / 泊松比分 / softmax 夺冠概率）
components/        Nav / MarketCard / Radar / Countdown / ui 原子组件
```

## 数据源说明

| 数据 | 来源 | 状态 |
|------|------|------|
| Polymarket 盘口、赔率、成交量 | Gamma API（`gamma-api.polymarket.com`，公开免密钥） | ✅ **实时真实** |
| 币安 / OKX 报价 | 价差板块中以 Polymarket 价为锚的**示例数据** | ⏳ 待确认两家是否有公开 API |
| 球队 / 赛程 / 球员 / 照片 | `lib/` 内**精选示例数据**，球员头像用 DiceBear 占位 | ⏳ 待接入 API-Football / SportMonks |

> 热度算法见 `lib/polymarket.ts` 的 `eventToMarket`：
> `0.45×24h成交 + 0.30×log(总量) + 0.15×流动性 + 0.10×临场`。

## 接真实足球数据（下一步）

1. 申请 [API-Football](https://www.api-football.com/) 或 [football-data.org](https://www.football-data.org/) 的 key。
2. 在 `lib/worldcup.ts` / `lib/players.ts` 用同样的类型（`Team` / `Match` / `Player`）
   写一个 fetch 适配层替换静态数组——页面无需改动。
3. 球员真实照片：把 `Player.photo` 填上授权图片 URL 即可覆盖 DiceBear 占位。

## 路线图

- **V1（当前）**：热度榜 + 价差/价值雷达 + 时间线 + 比赛/球队/球员页 + 胜率模型
- **V2**：接入真实足球 API、赔率历史走势图、单场盘口聚合
- **V3**：自选关注 Watchlist、价格提醒（Web Push）、免费预测战绩排行榜、多语言

> ⚠️ 仅供信息参考，非投资建议。预测市场存在风险，请遵守所在地区法律。
