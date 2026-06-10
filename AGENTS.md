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

## Supabase MCP

Supabase development MCP is configured for project `hgxmpnwvphpivlsemywo`.

- Codex global MCP: `supabase`
- Claude Code user MCP: `supabase`
- MCP URL: `https://mcp.supabase.com/mcp?project_ref=hgxmpnwvphpivlsemywo`
- Mode: development database, write access allowed, no feature subset configured.
- Agent Skills installed in this repo:
  - `.agents/skills/supabase`
  - `.agents/skills/supabase-postgres-best-practices`

Codex setup commands:

```bash
codex mcp add supabase --url "https://mcp.supabase.com/mcp?project_ref=hgxmpnwvphpivlsemywo"
codex mcp login supabase
codex mcp get supabase
```

Claude Code setup commands:

```bash
claude mcp add --scope user --transport http supabase "https://mcp.supabase.com/mcp?project_ref=hgxmpnwvphpivlsemywo"
claude mcp get supabase
```

Claude Code does not expose `claude mcp login`; authenticate from inside Claude Code with `/mcp`, choose `supabase`, and complete the browser OAuth flow.

Skill install command:

```bash
npx skills add supabase/agent-skills
```

After adding MCP servers or skills, restart/new-open the relevant agent session so tools and skills are loaded.

## Required Environment Variables

Production currently depends on these Vercel environment variables:

- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`
- `AI_FALLBACK_MODELS`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Keep `.env.local` local only. Do not commit secrets.

## Launch Readiness

### Already Working

- Vercel project is linked locally in `.vercel/project.json`.
- Vercel CLI is installed and authenticated for `qianzhu18`.
- Production environment variables exist in Vercel.
- `pnpm build` passes locally.
- Latest Vercel production deployment is `dpl_CWT5EafPTwMNYEQbzTxgCkuhk66j`, `Ready`, and aliased to `https://worldcup-polymarket-win.vercel.app`; use `vercel inspect worldcup-polymarket-win.vercel.app` for fresh status.
- Vercel project is connected to GitHub repository `qianzhu18/worldcup`.
- Public pages render from generated World Cup data and Polymarket/mock-market fallback paths.
- User accounts use Supabase Auth, and P0 match predictions/favorites use Supabase Postgres with RLS.
- Registration sets an explicit email verification redirect to `/login?verified=1`.
- `/auth/confirm` exists for Supabase SSR token-hash email confirmation links.
- Basic `/privacy` and `/terms` pages exist.
- Production smoke test exists: `pnpm test:smoke:prod`; the latest production run passed, including `/api/signals`.
- Homepage build-time AI champion pricing is disabled unless `ENABLE_BUILD_AI_CHAMPION=true`; use precompute/cache before enabling in production builds.
- `/api/signals` defaults to a fast market+model path; `?ai=true` enables AI, and `?track=true` enables best-effort tracking writes.

### Not Yet Production-Grade

- AI calls can still slow explicit AI paths. Homepage build-time champion AI is currently opt-in, and `/api/signals?ai=true` has a short fallback timeout. Move AI pricing/signals to durable cache or scheduled precompute before heavy traffic.
- Preview Vercel env parity is incomplete. The CLI required a non-production Git branch target for Preview env vars; configure Preview branch variables after choosing the branch strategy.
- There is no custom production domain configured in this repo. The current public URL is a Vercel subdomain.
- Signal/snapshot writes are opt-in best-effort until a server-only Supabase secret/service key is configured; user predictions are the P0 durable multiplayer surface.
- Prediction-market compliance needs legal review before broad promotion: risk disclosure, privacy policy, and terms exist, but jurisdiction guidance, age restrictions, and analytics consent are not complete.
- Observability is still thin. GitHub Actions smoke testing exists; add real alerting, error monitoring, and uptime monitoring before relying on the service publicly.

## Supabase Auth Email Configuration

Application-side support exists, but hosted Supabase Auth settings still need Dashboard or Management API access.

- Site URL: `https://worldcup-polymarket-win.vercel.app`
- Redirect URLs:
  - `https://worldcup-polymarket-win.vercel.app/login`
  - `https://worldcup-polymarket-win.vercel.app/auth/confirm`
  - `http://localhost:3000/**`
- Recommended SSR email confirmation template:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}
```

When a custom domain is added, replace the Vercel subdomain with the custom domain in Site URL and add matching redirect URLs before switching public traffic.

## Observability And Analytics Preference

Data ownership is a product requirement. Prefer self-hosted or first-party storage for behavior analytics.

- Product analytics and strategy analysis: self-hosted PostHog if the team wants funnels, retention, cohorts, feature flags, experiments, session replay, and heatmaps in one stack.
- Simple web analytics: self-hosted Umami or Plausible if only pageviews/referrers/conversions are needed.
- Uptime: self-hosted Uptime Kuma for HTTP, keyword, JSON, TCP, DNS, and database checks.
- Error monitoring: GlitchTip or Sentry self-hosted.
- Metrics/logs later: Grafana with Prometheus and Loki.
- Microsoft Clarity is useful and free for heatmaps/session replay, but it should not be the source of truth if user-behavior data must remain under our control.

## Self-Hosted Observability Node

- Server IP: `107.174.53.171`
- OS: Debian GNU/Linux 12
- Current observed resources: 1 vCPU, about 1GB RAM, 24GB root disk with about 8GB free after Uptime Kuma install.
- Docker and Docker Compose are installed.
- Uptime Kuma:
  - URL: `https://uptime.qianzhu.online`
  - Direct fallback URL: `http://107.174.53.171:3001`
  - Compose path: `/opt/observability/uptime-kuma/compose.yaml`
  - Container: `uptime-kuma`
  - Image: `louislam/uptime-kuma:2-slim`
  - Memory cap: `192m`
  - Configured monitors:
    - `WorldCup Production Home` -> `https://worldcup-polymarket-win.vercel.app/`
    - `WorldCup Login Page` -> `https://worldcup-polymarket-win.vercel.app/login`
    - `WorldCup Signals API` -> `https://worldcup-polymarket-win.vercel.app/api/signals`
    - `WorldCup Auth Confirm Route` -> `https://worldcup-polymarket-win.vercel.app/auth/confirm`
  - Known qianzhu domain monitors were added from `/home/web/conf.d/*.conf`.

Current certificate follow-up:

- Renewed or validated during 2026-06-10 work: `uptime.qianzhu.online`, `dpanel.qianzhu.online`, `pansou.qianzhu.online`, and `speedtest.qianzhu.online`.
- Still pending after SSH started closing during key exchange: `synctv.qianzhu.online`, `tv.qianzhu.online`, `monitor.qianzhu.online`, and `kuma.qianzhu.online`.
- Resume by restoring SSH access, then run `/root/auto_cert_renewal.sh` with `DOMAIN=<host>` after ensuring each Nginx config exposes `/.well-known/acme-challenge/` on HTTP before redirecting.

Do not store observability passwords or server credentials in the repo. Rotate SSH credentials after setup. This server is too small and already too busy for self-hosted PostHog; use a larger server before installing analytics infrastructure.

## Documentation Version

- 2026-06-09.5: Added Vercel Git connection, production smoke test, basic privacy/terms pages, and launch-finalization TODO ownership.
- 2026-06-09.6: Added Supabase Auth email redirect support and self-owned observability/analytics guidance.
- 2026-06-09.7: Recorded production deployment `dpl_CWT5EafPTwMNYEQbzTxgCkuhk66j` and post-deploy smoke pass.
- 2026-06-09.8: Recorded self-hosted Uptime Kuma deployment and noted PostHog server sizing blocker.
- 2026-06-10.1: Recorded `uptime.qianzhu.online` reverse proxy, qianzhu domain monitors, partial certificate renewal, and SSH recovery blocker.
- 2026-06-09.4: Migrated P0 multiplayer auth/prediction storage to Supabase Auth + Postgres RLS.
- 2026-06-09.3: Added Supabase MCP configuration, Claude/Codex authentication notes, and installed Supabase Agent Skills.
- 2026-06-09.2: Recorded production Vercel deployment `dpl_C3WTMSptjND9Rj8EoPUAJiLPJfw6` and verified production alias.
- 2026-06-09.1: Added project workflow, Vercel deployment SOP, environment inventory, and launch-readiness assessment.
