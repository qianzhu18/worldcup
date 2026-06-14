# JMWL 决策竞技场 — 设计方案

版本：2026-06-14.1
目标：2 小时内交付，Codex 并行开发

---

## 一、产品概述

**一句话：** 用户在每场比赛前选择"信哪个 AI 模型"，押积分预测胜平负，赛后结算积分，排行榜实时更新。

**核心链路：**
```
今日比赛列表 → 决策看板（3 个模型概率对照）→ 用户选模型 + 选方向 + 押积分
→ 比赛结束 → 系统结算 → 积分变化 → 排行榜更新 → 用户回来
```

**Slogan 兑现：** 这就是"赛前有底"（模型给参考）和"赛后有谱"（结算 + 排行榜）。

---

## 二、需要新增/修改的模块总览

| 编号 | 模块 | 类型 | 文件路径 | 优先级 |
|------|------|------|----------|--------|
| M1 | DB Migration | 新增 | `supabase/migrations/20260614_decision_arena.sql` | P0 |
| M2 | 多模型引擎 | 新增 | `lib/multi-ai.ts` | P0 |
| M3 | 决策看板 API | 新增 | `app/api/dashboard/route.ts` | P0 |
| M4 | 结算 API | 新增 | `app/api/settle/route.ts` | P0 |
| M5 | 改造预测 API | 修改 | `app/api/predictions/route.ts` | P0 |
| M6 | 决策看板页面 | 新增 | `app/dashboard/page.tsx` | P0 |
| M7 | 改造预测表单组件 | 修改 | `components/MatchPredictionForm.tsx` | P0 |
| M8 | 模型排行榜 | 修改 | `app/leaderboard/page.tsx` + `app/api/leaderboard/route.ts` | P1 |
| M9 | 导航加入口 | 修改 | `components/Nav.tsx` + `app/page.tsx` | P1 |

---

## 三、数据库设计（M1）

### 新增表：`model_predictions`

记录每个 AI 模型对每场比赛的独立预测，用于模型排行榜。

```sql
-- 每个 AI 模型对每场比赛的独立预测
create table if not exists public.model_predictions (
  id uuid primary key default gen_random_uuid(),
  match_id text not null,                    -- 比赛 ID，如 'm1', 'm2'
  model_name text not null,                  -- 模型名：'minimax', 'deepseek', 'qwen'
  home_prob numeric not null,                -- 主胜概率 0-1
  draw_prob numeric not null,                -- 平局概率 0-1
  away_prob numeric not null,                -- 客胜概率 0-1
  summary text,                              -- 模型一句话中文分析
  factors jsonb default '[]'::jsonb,         -- 关键依据数组
  confidence numeric default 0.5,            -- 把握度 0-1
  actual_result text,                        -- 实际结果：'home'/'draw'/'away'，结算后填入
  is_correct boolean,                        -- 是否预测正确，结算后填入
  settled_at timestamptz,                    -- 结算时间
  created_at timestamptz not null default now(),
  unique (match_id, model_name)              -- 每场每模型只有一条
);

-- RLS：所有人可读（用于排行榜展示）
alter table public.model_predictions enable row level security;
create policy "model_predictions public read" on public.model_predictions
  for select to anon, authenticated using (true);
-- 只有 service role 可写（API 端用 service key 插入）

-- 索引
create index if not exists model_predictions_match_idx on public.model_predictions (match_id);
create index if not exists model_predictions_model_idx on public.model_predictions (model_name);
```

### 新增视图：`model_leaderboard`

```sql
create or replace view public.model_leaderboard as
select
  model_name,
  count(*) filter (where settled_at is not null) as total_settled,
  count(*) filter (where is_correct = true) as correct_count,
  case
    when count(*) filter (where settled_at is not null) > 0
    then round(
      count(*) filter (where is_correct = true)::numeric
      / count(*) filter (where settled_at is not null) * 100,
      1
    )
    else 0
  end as accuracy,
  count(*) filter (where settled_at is null) as pending_count
from public.model_predictions
group by model_name
order by accuracy desc;
```

### 新增视图：`user_decision_leaderboard`

用户决策排行榜——带模型维度的胜率统计。

```sql
create or replace view public.user_decision_leaderboard as
select
  p.user_id,
  pr.name,
  pr.avatar_url,
  up.balance,
  up.rank_title,
  count(*) filter (where p.status = 'settled') as settled_count,
  count(*) filter (where p.status = 'settled' and p.settled_points > 0) as win_count,
  case
    when count(*) filter (where p.status = 'settled') > 0
    then round(
      count(*) filter (where p.status = 'settled' and p.settled_points > 0)::numeric
      / count(*) filter (where p.status = 'settled') * 100,
      1
    )
    else 0
  end as accuracy,
  -- 用户最常选择的模型
  (select mp2.model_name
   from public.user_predictions p2
   join public.model_predictions mp2 on mp2.match_id = p2.target_id
     and (p2.metadata->>'trusted_model') = mp2.model_name
   where p2.user_id = p.user_id
   group by mp2.model_name
   order by count(*) desc
   limit 1) as favorite_model
from public.user_predictions p
join public.profiles pr on pr.id = p.user_id
left join public.user_points up on up.user_id = p.user_id
group by p.user_id, pr.name, pr.avatar_url, up.balance, up.rank_title;
```

### 修改 `user_predictions.metadata` 约定

`metadata` 字段（jsonb）新增以下 key：

```json
{
  "homeLabel": "France",
  "awayLabel": "Germany",
  "kickoff": "2026-06-15T20:00:00Z",
  "trusted_model": "minimax",       // 用户选择信哪个模型
  "model_home_prob": 0.45,          // 该模型的主胜概率
  "model_draw_prob": 0.25,          // 该模型的平局概率
  "model_away_prob": 0.30           // 该模型的客胜概率
}
```

---

## 四、多模型引擎（M2）

### 新增文件：`lib/multi-ai.ts`

并行调用 3 个模型，每个模型独立出 1X2 概率。复用现有 `ai.ts` 的 `callModel` 逻辑。

```typescript
// 导出类型
export type ModelPrediction = {
  modelName: string;       // 'minimax' | 'deepseek' | 'qwen'
  modelLabel: string;      // 'MiniMax' | 'DeepSeek' | 'Qwen'
  home: number;            // 主胜概率 0-1
  draw: number;            // 平局概率 0-1
  away: number;            // 客胜概率 0-1
  summary: string;         // 一句话中文分析
  factors: string[];       // 2-3 条关键依据
  confidence: number;      // 0-1
};

// 导出函数
export async function getMultiModelPredictions(
  matchId: string,
  homeCode: string,
  awayCode: string
): Promise<ModelPrediction[]>
```

**实现要点：**
- 3 个模型并行调用（`Promise.allSettled`），失败的降级跳过
- 每个模型使用相同 prompt 模板，但各自独立调用
- 结果缓存 30 分钟（复用 `ai.ts` 的缓存模式）
- 模型列表：
  - `minimax-m3:free` → label: "MiniMax"
  - `deepseek-v4-pro` → label: "DeepSeek"
  - `qwen3.7-max` → label: "Qwen"
- Prompt 模板：与现有 `aiMatchAnalysis` 相同，但每个模型单独调用
- 返回结果按 `confidence` 降序排列

**Prompt 模板（中文）：**
```
你是资深足球赛事分析师。为指定对阵做独立的胜平负概率评估。
只依据两队实力、阵容、近期状态与战术克制，严禁参考任何博彩或预测市场赔率。

对阵：{homeName}(主, FIFA#{homeRank}) vs {awayName}(客, FIFA#{awayRank})，2026 世界杯，中立球场。

只返回 JSON：{"home": 主胜概率%, "draw": 平局概率%, "away": 客胜概率%, "confidence": 0到1的把握度, "factors": [两条简短中文关键依据], "summary": "一句话中文总结"}。三个概率加和为100。
```

---

## 五、API 设计

### M3：决策看板 API `GET /api/dashboard`

**请求：** 无参数，返回今日/近期比赛的多模型预测。

**响应：**
```json
{
  "matches": [
    {
      "matchId": "m1",
      "home": { "code": "FRA", "name": "France", "zh": "法国" },
      "away": { "code": "GER", "name": "Germany", "zh": "德国" },
      "kickoff": "2026-06-15T20:00:00Z",
      "status": "upcoming",
      "market": {
        "home": 0.41,
        "draw": 0.28,
        "away": 0.31
      },
      "models": [
        {
          "modelName": "minimax",
          "modelLabel": "MiniMax",
          "home": 0.45,
          "draw": 0.25,
          "away": 0.30,
          "summary": "法国反击效率被低估，市场平局定价偏高",
          "factors": ["法国反击效率被低估", "德国中场控制力下降"],
          "confidence": 0.72
        },
        {
          "modelName": "deepseek",
          "modelLabel": "DeepSeek",
          "home": 0.42,
          "draw": 0.30,
          "away": 0.28,
          "summary": "双方实力接近，法国主场优势有限",
          "factors": ["双方实力接近", "法国主场优势有限"],
          "confidence": 0.65
        },
        {
          "modelName": "qwen",
          "modelLabel": "Qwen",
          "home": 0.48,
          "draw": 0.22,
          "away": 0.30,
          "summary": "法国阵容深度占优，看好主胜",
          "factors": ["法国阵容深度占优", "德国近期状态不佳"],
          "confidence": 0.70
        }
      ],
      "modelConsensus": "home",        // 3 个模型中多数看好哪个方向
      "consensusStrength": 0.67,       // 一致性（2/3 = 0.67）
      "biggestDivergence": "draw",     // 模型间分歧最大的方向
      "divergenceRange": 0.08          // 分歧幅度
    }
  ]
}
```

**实现要点：**
- 从 `MATCHES` 取未来比赛（status === 'upcoming'，按 kickoff 排序）
- 跳过已开赛的
- 对每场调用 `getMultiModelPredictions()`
- 从 Polymarket 获取市场概率（如有对应 market）
- 计算共识和分歧
- 缓存 5 分钟（ISR 或内存缓存）

### M4：结算 API `POST /api/settle`

**请求：**
```json
{
  "matchId": "m1",
  "result": "home"    // 'home' | 'draw' | 'away'
}
```

**响应：**
```json
{
  "success": true,
  "settled": 12,       // 结算了多少条预测
  "modelSettled": 3    // 结算了多少条模型预测
}
```

**实现逻辑：**

```
1. 验证 matchId 存在且比赛已结束
2. 结算 user_predictions：
   - 找到该 matchId 所有 status='pending' 的预测
   - selection === result → 赢：settled_points = wager * 2
   - selection !== result → 输：settled_points = 0
   - 更新 status = 'settled', actual_result = result, settled_at = now()
   - 赢的用户：update user_points set balance += settled_points, total_won += settled_points
   - 记录 point_transactions
3. 结算 model_predictions：
   - 找到该 matchId 所有 model_predictions
   - home_prob 最高且 result === 'home' → is_correct = true
   - draw_prob 最高且 result === 'draw' → is_correct = true
   - away_prob 最高且 result === 'away' → is_correct = true
   - 其他 → is_correct = false
   - 更新 actual_result, settled_at
```

**注意：** 此 API 需要 service role key（`SUPABASE_SERVICE_ROLE_KEY`），因为需要跨用户写入。如未配置，降级为 admin-only 手动触发。

### M5：改造预测 API `POST /api/predictions`

**现有逻辑不变，新增：**
- 请求体新增 `wager`（可选，10-100）和 `trustedModel`（可选，模型名）
- 如果提供了 `wager`：
  1. 先 upsert 预测记录
  2. 调用 `place_wager(user.id, prediction.id, wager)` 扣积分
  3. 把 `trusted_model`、模型概率写入 `metadata`
- 如果没提供 `wager`：走现有逻辑（免费预测，不扣积分）

**修改后的请求体：**
```json
{
  "gameType": "match_1x2",
  "targetId": "m1",
  "selection": "home",
  "confidence": 3,
  "wager": 50,                    // 新增：可选，10-100
  "trustedModel": "minimax",      // 新增：可选
  "modelProbabilities": {         // 新增：可选，该模型的概率快照
    "home": 0.45,
    "draw": 0.25,
    "away": 0.30
  },
  "metadata": {                   // 现有字段，会被合并
    "homeLabel": "France",
    "awayLabel": "Germany"
  }
}
```

---

## 六、前端页面设计

### M6：决策看板页面 `app/dashboard/page.tsx`

**类型：** Server Component + Client 子组件

**页面结构：**

```
┌─────────────────────────────────────────────────┐
│  决策竞技场                                       │
│  选择你信任的 AI 模型，押注你的判断               │
├─────────────────────────────────────────────────┤
│  [我的积分: 1200] [今日已预测: 2场] [我的排名: #7]│
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐│
│  │ 🇫🇷 法国 vs 德国 🇩🇪  · 6/15 20:00          ││
│  │                                              ││
│  │  模型       主胜    平局    客胜   信心  分析 ││
│  │  ─────────────────────────────────────────── ││
│  │  MiniMax    45%     25%    30%    72%  ...   ││
│  │  DeepSeek   42%     30%    28%    65%  ...   ││
│  │  Qwen       48%     22%    30%    70%  ...   ││
│  │  ─────────────────────────────────────────── ││
│  │  市场       41%     28%    31%              ││
│  │  共识: 主胜 (2/3模型)  分歧: 平局 ±8%       ││
│  │                                              ││
│  │  [选择模型: MiniMax ▼]                       ││
│  │  [主胜] [平局] [客胜]                        ││
│  │  积分押注: ──●────── 50分  预计收益: 100分    ││
│  │  [提交决策]                                   ││
│  └─────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────┐│
│  │ 下一场比赛卡片...                             ││
│  └─────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│  [玩家排行榜 Top 5]        [模型排行榜]          │
│  🥇 用户A  1200分  68%    MiniMax   72%         │
│  🥈 用户B  1100分  65%    DeepSeek  68%         │
│  🥉 用户C   980分  62%    Qwen      65%         │
└─────────────────────────────────────────────────┘
```

**子组件拆分：**

| 组件 | 文件 | 类型 | 职责 |
|------|------|------|------|
| `DecisionCard` | `components/DecisionCard.tsx` | Client | 单场比赛的决策卡（模型表格 + 选择 + 押注） |
| `ModelComparisonTable` | `components/ModelComparisonTable.tsx` | Client | 3 个模型概率对比表格 |
| `WagerSlider` | `components/WagerSlider.tsx` | Client | 积分押注滑块 |
| `MiniLeaderboard` | `components/MiniLeaderboard.tsx` | Server | 页面底部的排行榜摘要 |

### M7：改造预测表单组件

在现有 `MatchPredictionForm.tsx` 基础上：
- 新增"选择信任模型"下拉框（从决策看板跳转时预填）
- 新增积分押注滑块（10-100，显示余额）
- 提交时带 `wager` 和 `trustedModel` 参数
- 显示潜在收益（wager × 2）

---

## 七、排行榜改造（M8）

### 现有排行榜页面新增第三个 Tab："模型排行"

```
┌─────────────────────────────────────────┐
│  排行榜                                  │
│  [积分排行] [准确率排行] [模型排行]       │
├─────────────────────────────────────────┤
│  模型排行                                │
│                                          │
│  🥇 MiniMax    72.0%  (18/25 正确)      │
│  🥈 Qwen       68.0%  (17/25 正确)      │
│  🥉 DeepSeek   64.0%  (16/25 正确)      │
│                                          │
│  已结算 25 场 / 待结算 3 场              │
└─────────────────────────────────────────┘
```

**API 改造：** `GET /api/leaderboard?type=model` 新增 `model` 类型，查 `model_leaderboard` 视图。

---

## 八、导航和入口（M9）

### Nav.tsx 改造

在导航栏新增"决策竞技场"入口（高亮显示），替换或并列现有"博弈信号"。

```
市场扫描 | 决策竞技场 | 赛程时间线 | 竞技排行榜 | 球队 | 球员
```

### 首页改造

在首页新增一个模块："今日决策焦点"，展示今日最值得决策的 1-2 场比赛，点击跳转 `/dashboard`。

---

## 九、积分经济学

| 项目 | 数值 | 说明 |
|------|------|------|
| 注册送积分 | 500 | 新用户首次登录自动到账（改 `claim_daily_points`） |
| 每日签到 | 100 + streak | 现有逻辑不变 |
| 押注范围 | 10-100 | 单场押注上下限 |
| 赔率 | ×2 | 猜对 = wager × 2，猜错 = 0 |
| 段位门槛 | rookie/silver/gold/diamond/legend | 现有逻辑不变 |

---

## 十、Codex 并行开发任务分配

### 并行组 A：后端（无前端依赖）

| 任务 | 文件 | 预计时间 |
|------|------|----------|
| A1: DB Migration | `supabase/migrations/20260614_decision_arena.sql` | 10 min |
| A2: 多模型引擎 | `lib/multi-ai.ts` | 20 min |
| A3: 决策看板 API | `app/api/dashboard/route.ts` | 15 min |
| A4: 结算 API | `app/api/settle/route.ts` | 20 min |
| A5: 改造预测 API | `app/api/predictions/route.ts` | 15 min |

### 并行组 B：前端（依赖 A2 的类型定义）

| 任务 | 文件 | 预计时间 |
|------|------|----------|
| B1: 决策看板页面 | `app/dashboard/page.tsx` | 20 min |
| B2: DecisionCard 组件 | `components/DecisionCard.tsx` | 15 min |
| B3: ModelComparisonTable | `components/ModelComparisonTable.tsx` | 10 min |
| B4: WagerSlider | `components/WagerSlider.tsx` | 10 min |
| B5: 改造 MatchPredictionForm | `components/MatchPredictionForm.tsx` | 10 min |

### 并行组 C：排行榜和导航（依赖 A）

| 任务 | 文件 | 预计时间 |
|------|------|----------|
| C1: 排行榜 API 改造 | `app/api/leaderboard/route.ts` | 10 min |
| C2: 排行榜页面改造 | `app/leaderboard/page.tsx` | 15 min |
| C3: 导航改造 | `components/Nav.tsx` | 5 min |
| C4: 首页入口 | `app/page.tsx` | 5 min |

---

## 十一、验收标准

1. `/dashboard` 页面可访问，展示今日比赛 + 3 个模型概率对照
2. 用户可选择"信哪个模型" + 选择方向 + 押积分（10-100）
3. 提交后积分扣除，预测记录包含 `trusted_model` 和 `wager`
4. `POST /api/settle` 可手动触发结算，积分正确流转
5. 排行榜新增"模型排行" Tab，展示 3 个模型准确率
6. 导航栏有"决策竞技场"入口
7. 新用户注册后有 500 积分可用

---

## 十二、风险和降级

| 风险 | 降级方案 |
|------|----------|
| AI 模型调用超时 | 3 个模型中任一失败 → 跳过该模型，显示 2 个模型 |
| 3 个模型全失败 | 降级为只显示 Elo 模型概率（`matchProbabilities`） |
| Polymarket API 不可用 | 市场概率行显示"—"，不影响模型对比 |
| Supabase service key 未配置 | 结算 API 返回 403，提示配置 |
| 用户无积分 | 显示"免费预测"模式（不扣积分，不参与积分排行） |
