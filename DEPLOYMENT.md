# Deployment architecture

The site runs as three decoupled processes. Preview and webhook receiver are bare-metal Node managed by pm2 (see [ecosystem.config.cjs](./ecosystem.config.cjs)); production HTML is served by an nginx container that mounts the build output.

### Processes

1. **Preview (`gmjo-preview`)** — `npm run dev` under pm2. Hybrid SSR via `@astrojs/node`: most routes are prerendered at startup, the `[lang]/[...slug].astro` route is SSR (`export const prerender = false`) so Directus edits show up on next page load with no rebuild. Editors use this for the visual editor (`?visual-editing=true`).

2. **Webhook receiver (`gmjo-webhook`)** — `scripts/webhook-receiver.mjs` under pm2. Express server, default port `4400`. Reads `WEBHOOK_TOKEN` (and other env) from [.env](./.env) via Node's native `--env-file` flag (set as `interpreter_args` in the pm2 config). Endpoints:
   - `POST /rebuild` — bearer-token auth, in-flight mutex (returns `409` if a build is running), returns `202` immediately and runs `scripts/deploy.sh` in the background.
   - `GET /status` — auth-required; returns `inFlight` flag plus the last build's result.
   - `GET /health` — unauthenticated liveness check.

3. **Production nginx** — containerised, configured by [deploy/nginx.conf](./deploy/nginx.conf). Bind-mounts `web/dist` (a real directory whose contents are rsynced in by each deploy — see below) as the document root. Serves pure static HTML, encodes the redirects from astro.config.mjs as 302s at the edge, and applies tiered cache headers (`/_astro/*` immutable, media short-cache, HTML `no-cache`).

### Build flow

A POST from a Directus Flow (or manual `npm run deploy`) runs [scripts/deploy.sh](./scripts/deploy.sh):

1. Build into `releases/staging-<timestamp>/` using `node scripts/build-static.mjs --out-dir <staging>` — this is the SSG variant: [scripts/build-static.mjs](./scripts/build-static.mjs) swaps in [src/page-variants/slug-static.astro](./src/page-variants/slug-static.astro) (which has `getStaticPaths`) over the SSR `[..slug].astro`, runs `astro build`, then restores the SSR file in a `finally` block (a `.ssr.bak` next to the route during the build).
2. On success, rename staging to `releases/<timestamp>/`, then `rsync -a --delete-after releases/<timestamp>/client/ dist/`. `dist/` is a fixed directory — its inode never changes — so docker bind mounts on it stay valid across deploys. `--delete-after` writes new files first and removes stale ones only after the sync completes, giving per-file atomicity. A request that races a deploy sees either the old file or the new file, never a missing one.
3. On failure, the staging dir is removed and the previous release stays live — `dist/` is untouched.
4. Garbage-collect: keep the last `KEEP_RELEASES` (default 5) timestamped release dirs for rollback. Rollback is `rsync -a --delete-after releases/<older>/client/ dist/`.

Build logs go to `logs/build-<timestamp>.log`.

### Where the secrets live

[.env](./.env) holds `DIRECTUS_URL`, `DIRECTUS_TOKEN`, `WEBHOOK_TOKEN`. The webhook receiver picks them up via Node's `--env-file`; the astro preview process picks them up via Astro's built-in `import.meta.env`. Subprocess inheritance carries them through to `astro build` during a deploy. Never commit `.env` — it's in [.gitignore](./.gitignore) along with `dist/`, `releases/`, `logs/`, and the `*.ssr.bak` transient files.

### Wiring a Directus Flow

Manual trigger on the relevant collection → "Webhook / Request URL" operation:

- URL: `http://<host>:4400/rebuild` (from inside docker-compose use `host.docker.internal:4400` or the host gateway IP)
- Method: `POST`
- Headers: `Authorization: Bearer <WEBHOOK_TOKEN>`
- Optional body: `{ "triggered_by": "{{$accountability.user}}" }` — the receiver logs this.

### Operational notes

- The webhook receiver is the only thing that should write to `dist/` or `releases/` in production. Don't run `npm run build:static` directly on the prod host — it writes to `dist/` unconditionally and would corrupt the live release.
- `dist/` is a stable directory (no symlink), so docker bind mounts stay valid across deploys without container restarts.
- If editors need pre-publication review, point them at the preview SSR instance (`gmjo-preview`) — production reflects only what's been Published in Directus _and_ deployed via a webhook trigger.
