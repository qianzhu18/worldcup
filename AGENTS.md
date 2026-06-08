# AGENTS.md

## Claude Code / Agent Work Rules

每次完成对话之前，commit 本轮涉及修改的文件并 push。

每次开始任务之前先确定任务体量，非简单任务一律：

- 先分析任务
- 创建或更新 Todo list 文档
- 分步执行
- 每步更新 Todo list 文档
- 校验检查
- 提交 git
- 更新文档，注意更新文档的版本号和修改信息

## Claude Code 八荣八耻

以瞎猜接口为耻，以认真查询为荣。
以模糊执行为耻，以寻求确认为荣。
以臆想业务为耻，以人类确认为荣。
以创造接口为耻，以复用现有为荣。
以跳过验证为耻，以主动测试为荣。
以破坏架构为耻，以遵循规范为荣。
以假装理解为耻，以诚实无知为荣。
以盲目修改为耻，以谨慎重构为荣。

## Project Snapshot

- Project: `worldcup-polymarket-win`
- App: JMWL World Cup, an AI + Polymarket 2026 World Cup prediction-market analysis site.
- Primary deployment target: Vercel.
- Current production alias: `https://worldcup-polymarket-win.vercel.app`
- Vercel project: `qianzhu18s-projects/worldcup-polymarket-win`
- Framework: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS.
- Package manager: `pnpm@10.26.2`.
- Secondary/legacy deployment path: Cloudflare Workers via OpenNext remains in the repo, but is not the active release path unless explicitly requested.

## Common Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm deploy:preview
pnpm deploy:prod
pnpm vercel:pull
```

## Vercel Deployment SOP

1. Confirm the worktree is understood before changing files:

```bash
git status --short --branch
```

2. Validate production build locally:

```bash
pnpm build
```

3. Confirm Vercel login and project linkage:

```bash
vercel whoami
cat .vercel/project.json
vercel env ls
```

4. Deploy preview when validating behavior:

```bash
pnpm deploy:preview
```

5. Deploy production:

```bash
pnpm deploy:prod
```

6. Inspect deployment:

```bash
vercel inspect worldcup-polymarket-win.vercel.app
vercel inspect worldcup-polymarket-win.vercel.app --logs
```

## Required Environment Variables

Production currently depends on these Vercel environment variables:

- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`
- `AI_FALLBACK_MODELS`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

Keep `.env.local` local only. Do not commit secrets.

## Launch Readiness

### Already Working

- Vercel project is linked locally in `.vercel/project.json`.
- Vercel CLI is installed and authenticated for `qianzhu18`.
- Production environment variables exist in Vercel.
- `pnpm build` passes locally.
- Vercel production deployment `dpl_C3WTMSptjND9Rj8EoPUAJiLPJfw6` is `Ready` and aliased to `https://worldcup-polymarket-win.vercel.app`.
- Public pages render from generated World Cup data and Polymarket/mock-market fallback paths.

### Not Yet Production-Grade

- User accounts are demo-grade. `lib/db.ts` uses local SQLite through `better-sqlite3`; Vercel serverless storage is not a durable user database. Move users, predictions, favorites, and signal history to Neon, Supabase, Vercel Postgres, Turso, or another managed database before real user launch.
- AI calls can slow builds or requests. The homepage calls `safeChampion()` during static generation/ISR. The previous Vercel build needed a retry because the primary AI model timed out after 60 seconds. Move AI pricing to an API route with durable cache, shorten timeout budgets, or precompute via scheduled jobs before heavy traffic.
- Preview/development Vercel env parity is incomplete. `vercel env ls` currently shows production variables; preview deployments need equivalent non-production values before they can be trusted.
- There is no custom production domain configured in this repo. The current public URL is a Vercel subdomain.
- Auth has a code fallback secret in `lib/auth.ts`. Production has `NEXTAUTH_SECRET`, but the code should fail fast in production if the secret is missing.
- Prediction-market compliance needs product/legal copy before broad promotion: risk disclosure exists, but privacy policy, terms, jurisdiction guidance, and analytics consent are not complete.
- Observability is thin. Add error monitoring, deployment checks, and uptime monitoring before relying on the service publicly.

## Documentation Version

- 2026-06-09.2: Recorded production Vercel deployment `dpl_C3WTMSptjND9Rj8EoPUAJiLPJfw6` and verified production alias.
- 2026-06-09.1: Added project workflow, Vercel deployment SOP, environment inventory, and launch-readiness assessment.
