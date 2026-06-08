# World Cup Project Todo

Version: 2026-06-09.3
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
- [ ] Push local commits to `origin/main`.

## Findings Log

- Project root is `worldcup-polymarket-win`; the parent directory is not a git repository.
- Current branch is `main`, one local commit ahead of `origin/main` before this task.
- README already references a Vercel URL, but package scripts still emphasize Cloudflare/OpenNext deployment.
- Vercel CLI `54.9.1` is installed and authenticated as `qianzhu18`.
- `.vercel/project.json` links to `qianzhu18s-projects/worldcup-polymarket-win`.
- Production Vercel env vars exist: `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_FALLBACK_MODELS`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.
- Local `pnpm build` passed and produced 259 routes/pages.
- Previous production Vercel deployment is `Ready`, but logs show the homepage AI call timed out once and triggered a Vercel static-generation retry.
- New production deployment completed with `pnpm deploy:prod`: `dpl_C3WTMSptjND9Rj8EoPUAJiLPJfw6`.
- Production alias verified: `https://worldcup-polymarket-win.vercel.app`.
- HTTP checks passed for `/`, `/timeline`, `/teams`, and `/players`.
- Push is blocked: GitHub rejected the current `qianzhu18` credentials for `yomislight/worldcup-polymarket-win` with HTTP 403. Local branch is ahead of `origin/main`.
