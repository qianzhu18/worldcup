# World Cup Project Todo

Version: 2026-06-10.1
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
- [x] Add app-side Supabase email confirmation redirect support.
- [x] Deploy self-hosted Uptime Kuma on the US server for first-pass uptime monitoring.

## True Launch Todo

### Done By Codex

- [x] Vercel GitHub connection: `vercel git connect https://github.com/qianzhu18/worldcup.git` completed.
- [x] Production smoke test command: `pnpm test:smoke:prod`.
- [x] Basic compliance pages: `/privacy` and `/terms`.
- [x] Footer links to Privacy Policy and Terms.
- [x] Scheduled GitHub Actions smoke test every 6 hours plus manual `workflow_dispatch`.
- [x] Homepage build-time AI champion pricing is opt-in via `ENABLE_BUILD_AI_CHAMPION=true`.
- [x] `/api/signals` defaults to market+model only; use `?ai=true` for AI and `?track=true` for best-effort tracking.
- [x] Registration now sends verified users back to `/login?verified=1`.
- [x] `/auth/confirm` can verify Supabase email OTP links when the hosted email template is switched to the SSR token-hash format.
- [x] Uptime Kuma is running at `http://107.174.53.171:3001` with monitors for production home, login, signals API, and auth confirmation route.
- [x] Uptime Kuma is also available through `https://uptime.qianzhu.online`.
- [x] Added service monitors for known `qianzhu.online` domains from the server Nginx configuration.

### Needs User Decision Or Credentials

- [ ] Custom domain: provide the domain name and confirm where DNS is managed. After that Codex can add it to Vercel and list DNS records.
- [ ] Supabase Auth email Dashboard config:
  - Site URL: `https://worldcup-polymarket-win.vercel.app` until a custom domain is configured.
  - Redirect URLs: `https://worldcup-polymarket-win.vercel.app/login`, `https://worldcup-polymarket-win.vercel.app/auth/confirm`, and local development URLs such as `http://localhost:3000/**`.
  - Email template, if using SSR token-hash confirmation: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}`.
  - SMTP sender: choose and verify a domain-backed provider before broad public launch.
- [ ] Real signup test: use a real inbox to register, confirm email if required, log in, submit one prediction, and confirm it appears in `/predictions`.
- [ ] Server-only Supabase secret/service key: provide a Vercel-only env var name/value such as `SUPABASE_SERVICE_ROLE_KEY` if signal/snapshot writes should be durable.
- [ ] Monitoring/analytics choice: Uptime Kuma is configured. Self-hosted PostHog still needs a larger server; current server is 1 vCPU, 1GB RAM, and about 8GB free disk, which is not enough for PostHog.
- [ ] Legal/compliance review: confirm jurisdiction wording, age restrictions, terms/privacy wording, contact method, analytics consent, and prediction-market risk copy.

### Codex Can Do After User Input

- [ ] Add custom domain in Vercel and verify DNS.
- [ ] Configure production/preview env vars for any branch or service keys you approve.
- [ ] Refactor `?track=true` signal/snapshot writes to use a server-only Supabase admin client and scheduled route.
- [ ] Move expensive AI calls into durable cache or scheduled precompute.
- [ ] Add selected monitoring/analytics SDK and alert checks.
- [ ] Add an Uptime Kuma notification channel after choosing destination: email SMTP, Telegram, Slack, Discord, Feishu, or webhook.
- [ ] Finish remaining origin certificate fixes after SSH access recovers: `synctv.qianzhu.online`, `tv.qianzhu.online`, `monitor.qianzhu.online`, and `kuma.qianzhu.online`.
- [ ] Provision a larger analytics server before installing PostHog: minimum 4GB RAM, recommended 8GB+ RAM, 2+ vCPU, and 50GB+ disk.
- [ ] Add first-party product event taxonomy: visit, signup_start, signup_verified, login_success, match_view, prediction_submit, signal_view, signal_filter, outbound_click.
- [ ] Add analytics consent/privacy copy before enabling heatmaps or session replay broadly.
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
- App-side Supabase Auth email redirect support was added on 2026-06-09. Hosted Supabase Site URL, Redirect URLs, SMTP sender, and optional email template still need Dashboard or Management API configuration.
- Supabase Auth email redirect support was deployed to production as `dpl_CWT5EafPTwMNYEQbzTxgCkuhk66j`; production smoke passed after deployment.
- Uptime Kuma was deployed on `107.174.53.171` on 2026-06-09. Four production monitors are active and the first heartbeat checks passed. PostHog and GlitchTip were intentionally not installed on this host because the server is already memory constrained.
- `uptime.qianzhu.online` was configured on 2026-06-10 with a Let's Encrypt certificate and Nginx reverse proxy to Uptime Kuma. Known qianzhu subdomain monitors were added. `dpanel.qianzhu.online` and `pansou.qianzhu.online` certificates were renewed before SSH access started closing during key exchange; `speedtest.qianzhu.online` appears certificate-valid but returns 404 at `/`. Remaining certificate/proxy work is pending SSH recovery.
