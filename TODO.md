# World Cup Project Todo

Version: 2026-06-09.5
Updated: 2026-06-09

## Current Task: Vercel Deployment And Launch Readiness

- [x] Confirm project root, git status, and existing deployment files.
- [x] Validate local production build.
- [x] Check Vercel CLI availability, authentication, and project linkage.
- [x] Add or update Vercel deployment scripts/configuration where needed.
- [x] Deploy with Vercel CLI.
- [x] Verify deployed URL and note runtime gaps.
- [x] Update AGENTS.md with project workflow, deployment SOP, and launch-readiness analysis.
- [x] Commit this task's changes.
- [x] Push previous local commits to `qianzhu18/main`.
- [x] Commit and push Supabase multiplayer migration.
- [x] Connect Vercel project to `qianzhu18/worldcup` for GitHub-based deployments.
- [x] Add repeatable production smoke test script.
- [x] Add basic Privacy Policy and Terms pages with footer links.
- [x] Add scheduled GitHub Actions production smoke test.
- [x] Disable homepage build-time AI champion pricing by default.
- [x] Optimize `/api/signals` default path so AI and tracking writes are opt-in.
- [x] Deploy and verify launch-hardening changes.

## True Launch Todo

### Done By Codex

- [x] Vercel GitHub connection: `vercel git connect https://github.com/qianzhu18/worldcup.git` completed.
- [x] Production smoke test command: `pnpm test:smoke:prod`.
- [x] Basic compliance pages: `/privacy` and `/terms`.
- [x] Footer links to Privacy Policy and Terms.
- [x] Scheduled GitHub Actions smoke test every 6 hours plus manual `workflow_dispatch`.
- [x] Homepage build-time AI champion pricing is opt-in via `ENABLE_BUILD_AI_CHAMPION=true`.
- [x] `/api/signals` defaults to market+model only; use `?ai=true` for AI and `?track=true` for best-effort tracking.

### Needs User Decision Or Credentials

- [ ] Custom domain: provide the domain name and confirm where DNS is managed. After that Codex can add it to Vercel and list DNS records.
- [ ] Supabase Auth email: configure Site URL, redirect URLs, and email sender/SMTP in Supabase Dashboard. Use the final custom domain if one will be used.
- [ ] Real signup test: use a real inbox to register, confirm email if required, log in, submit one prediction, and confirm it appears in `/predictions`.
- [ ] Server-only Supabase secret/service key: provide a Vercel-only env var name/value such as `SUPABASE_SERVICE_ROLE_KEY` if signal/snapshot writes should be durable.
- [ ] Monitoring/analytics choice: confirm whether to enable Vercel Web Analytics, Vercel Speed Insights, Sentry, Better Stack, or another uptime tool.
- [ ] Legal/compliance review: confirm jurisdiction wording, age restrictions, terms/privacy wording, contact method, analytics consent, and prediction-market risk copy.

### Codex Can Do After User Input

- [ ] Add custom domain in Vercel and verify DNS.
- [ ] Configure production/preview env vars for any branch or service keys you approve.
- [ ] Refactor `?track=true` signal/snapshot writes to use a server-only Supabase admin client and scheduled route.
- [ ] Move expensive AI calls into durable cache or scheduled precompute.
- [ ] Add selected monitoring/analytics SDK and alert checks.
- [ ] Update Privacy/Terms with your legal and brand wording.

## Findings Log

- Project root is `worldcup-polymarket-win`; the parent directory is not a git repository.
- Current branch is `main`, one local commit ahead of `origin/main` before this task.
- README already references a Vercel URL, but package scripts still emphasize Cloudflare/OpenNext deployment.
- Vercel CLI `54.9.1` is installed and authenticated as `qianzhu18`.
- `.vercel/project.json` links to `qianzhu18s-projects/worldcup-polymarket-win`.
- Production Vercel env vars exist: `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_FALLBACK_MODELS`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Local `pnpm build` passed and produced 259 routes/pages.
- Previous production Vercel deployment is `Ready`, but logs show the homepage AI call timed out once and triggered a Vercel static-generation retry.
- Previous production deployment completed with `pnpm deploy:prod`: `dpl_Gdfy96uAKDur4htYPc6QUjeNxgYh`.
- Launch-hardening production deployment completed with `pnpm deploy:prod`: `dpl_2MRtnQJSy2gRKdkB5NUuw9S55i4u`.
- Production alias verified: `https://worldcup-polymarket-win.vercel.app`.
- HTTP checks passed for `/`, `/login`, `/match/m1`, `/profile`, `/predictions`, `/api/predictions`, and `/api/signals`.
- Original push was blocked because GitHub rejected the current `qianzhu18` credentials for `yomislight/worldcup-polymarket-win` with HTTP 403.
- Remote was switched and pushed to `https://github.com/qianzhu18/worldcup.git`.
- P0 multiplayer backend is migrated to Supabase Auth + Postgres RLS.
- Production smoke test passed after signal API optimization; `/api/signals` responded in about 706ms on the final smoke run.
- Vercel Preview env variables could not be added globally from CLI; Vercel required a non-production Git branch target, and `main` is not allowed because it is the Production Branch.
- Local build showed homepage AI calls can trigger 60s static-generation retries; default build path no longer calls champion AI.
- `/api/signals` now skips request-time AI and Supabase tracking writes by default; explicit query params can still run those slower paths.
