# JMWL World Cup - 项目真实现状

**更新日期：** 2026-06-13
**线上地址：** https://worldcup-polymarket-win.vercel.app

---

## 一、用户真正能用的功能

以下是**线上已部署、用户可以直接使用**的功能：

| # | 功能 | 页面 | 说明 |
|---|------|------|------|
| 1 | 首页看板 | `/` | Polymarket 盘口热度榜、AI 价值雷达、模型夺冠概率 Top 8 |
| 2 | 注册/登录 | `/register` `/login` | Supabase Auth 邮箱注册 + 邮箱验证 |
| 3 | 赛程时间线 | `/timeline` | 104 场比赛按日分组，含 AI 胜率、公平赔率 |
| 4 | 比赛详情 | `/match/[id]` | AI 胜率预测、泊松比分、H2H（淘汰赛为 TBD 占位） |
| 5 | 球队中心 | `/teams` `/team/[code]` | 48 队分组总览 + 详情页（教练、战绩、阵容） |
| 6 | 球员中心 | `/players` `/player/[id]` | 1255 名球员 Watchlist + 六维雷达图 |
| 7 | 个人中心 | `/profile` | 基础账号资料展示 |
| 8 | 我的预测 | `/predictions` | 胜平负预测记录列表（无积分押注、无自动结算） |
| 9 | 博弈信号 | `/signals` | SignalDashboard 组件，展示信号原理和风险提示 |
| 10 | 隐私/条款 | `/privacy` `/terms` | 基础合规页面 |

**总计：15 个页面路由，核心看板功能完整。**

---

## 二、只有后端没有前端的功能

以下是 **DB schema/API 已写好，但用户看不到 UI** 的功能：

| # | 功能 | 后端状态 | 缺什么 | 工作量 |
|---|------|----------|--------|--------|
| 1 | 每日签到领积分 | ✅ `claim_daily_points()` 函数已写好 | Profile 页面没有"领积分"按钮 | 0.5天 |
| 2 | 预测积分押注 | ✅ `place_wager()` 函数已写好 | 比赛详情页没有积分滑块 | 1天 |
| 3 | 排行榜 | ✅ 视图 + API + 页面文件都存在 | 数据可能为空，需验证 | 0.5天 |
| 4 | 成就系统 | ✅ 表 + 8 个预设成就已写入 | 没有展示 UI | 1天 |
| 5 | 兑换商城 | ✅ 表 + 6 个商品 + API 已写好 | 没有商城页面 | 1天 |
| 6 | 积分流水 | ✅ `point_transactions` 表 + API | 没有流水展示 UI | 0.5天 |

**这些功能 Codex 可以直接接 UI，不需要重新写后端。**

---

## 三、完全没做的功能

| # | 功能 | 说明 | 优先级 |
|---|------|------|--------|
| 1 | 赛后自动结算 | 比赛结束后自动判定预测结果、更新积分 | P0 |
| 2 | 分享卡片 | 赛后生成可分享的预测结果图 | P1 |
| 3 | 邀请返积分 | 邀请码机制，双方得积分 | P1 |
| 4 | 赞助商广告位 | 首页/比赛页 banner 组件 | P2 |
| 5 | 自定义域名 | 当前是 Vercel 子域名 | P2 |
| 6 | SEO 优化 | meta 标签、结构化数据 | P2 |
| 7 | 数据看板 | 平台运营数据对外展示页 | P2 |

---

## 四、技术栈速查

```
框架：Next.js 15 (App Router) + React 19 + TypeScript
样式：Tailwind CSS 3（潮牌 Hype 设计系统）
数据库：Supabase (Auth + Postgres + RLS)
部署：Vercel
AI：TokenDance Gateway (MiniMax m3:free + fallback)
数据：Polymarket Gamma API（实时）
包管理：pnpm
```

---

## 五、数据库表清单

| 表名 | 用途 | 状态 |
|------|------|------|
| `profiles` | 用户档案 | ✅ 在用 |
| `user_predictions` | 预测记录 | ✅ 在用 |
| `user_favorites` | 收藏 | ✅ 在用 |
| `signals` | 博弈信号 | ✅ 在用 |
| `signal_outcomes` | 信号结果 | ✅ 在用 |
| `market_snapshots` | 市场快照 | ✅ 在用 |
| `user_points` | 积分账户 | ⚠️ 表已建，无 UI |
| `point_transactions` | 积分流水 | ⚠️ 表已建，无 UI |
| `achievements` | 成就定义 | ⚠️ 表已建，无 UI |
| `user_achievements` | 用户成就 | ⚠️ 表已建，无 UI |
| `rewards` | 兑换商品 | ⚠️ 表已建，无 UI |
| `redemptions` | 兑换记录 | ⚠️ 表已建，无 UI |

---

## 六、API 清单

| 路径 | 方法 | 功能 | 状态 |
|------|------|------|------|
| `/api/predictions` | GET | 获取用户预测列表 | ✅ 在用 |
| `/api/predictions` | POST | 提交预测 | ✅ 在用 |
| `/api/signals` | GET | 获取博弈信号 | ✅ 在用 |
| `/api/points` | GET | 获取积分/流水/成就 | ⚠️ API 存在，无前端调用 |
| `/api/points` | POST | 每日领取积分 | ⚠️ API 存在，无前端调用 |
| `/api/leaderboard` | GET | 排行榜查询 | ⚠️ API 存在，需验证 |
| `/api/rewards` | GET | 商品列表 | ⚠️ API 存在，无前端调用 |
| `/api/rewards` | POST | 兑换商品 | ⚠️ API 存在，无前端调用 |

---

## 七、给 Codex 的开发任务清单

按优先级排列，每个任务独立可执行：

### P0 - 本周必须完成

```
任务 1：每日签到 UI
- 在 Profile 页面添加"每日领积分"按钮
- 调用 POST /api/points
- 显示当前积分余额、连续登录天数、段位
- 文件：app/profile/page.tsx

任务 2：预测积分押注
- 在比赛详情页的预测表单中添加积分滑块（10-100）
- 调用 POST /api/predictions 时传入 wager 参数
- 显示潜在收益（2x 赔率）
- 文件：components/MatchPredictionForm.tsx, app/match/[id]/page.tsx

任务 3：赛后自动结算
- 创建 API Route /api/settle
- 逻辑：读取 status=pending 且 kickoff 已过的预测
- 对比 actual_result，计算积分变化
- 更新 user_points.balance 和 user_predictions.settled_points
- 用 Vercel Cron 或 GitHub Actions 定时调用
- 文件：app/api/settle/route.ts

任务 4：排行榜页面验证
- 确保 /leaderboard 页面数据正常显示
- 添加"我的排名"高亮
- 文件：app/leaderboard/page.tsx
```

### P1 - 下周完成

```
任务 5：成就展示 UI
- 在 Profile 页面展示已解锁成就徽章
- 解锁时弹出 toast 通知
- 文件：app/profile/page.tsx, 新组件 components/AchievementBadge.tsx

任务 6：兑换商城页面
- 新建 /rewards 页面
- 展示商品列表、积分价格、库存
- 兑换按钮调用 POST /api/rewards
- 文件：app/rewards/page.tsx

任务 7：积分流水页面
- 在 Profile 或独立页面展示积分收支记录
- 文件：app/profile/page.tsx 或 app/points/page.tsx
```

### P2 - 后续

```
任务 8：分享卡片（@vercel/og）
任务 9：邀请返积分机制
任务 10：赞助商广告位组件
任务 11：自定义域名配置
```

---

## 八、产品方向（一句话）

**"AI 看球搭子"** - 赛前有策略、赛中可追踪、赛后有复盘。

核心链路：每日签到领积分 → 看 AI 信号选比赛 → 押注积分预测 → 赛后自动结算 → 排行榜竞争 → 兑换奖品。

---

## 九、项目目标（一个月内）

1. **核心玩法闭合** - 让用户能完成预测→结算→排行的完整循环
2. **数据跑起来** - 世界杯期间积累用户和预测数据
3. **黑客松曝光** - 提交 2-3 个黑客松，作为简历项目

---

*本文档用于 Codex 开发交接，每个任务独立可执行。*
