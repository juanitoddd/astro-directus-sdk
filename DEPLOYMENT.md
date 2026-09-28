# Deployment architecture

The site runs as three Node processes managed by pm2 (see
[ecosystem.config.cjs](./ecosystem.config.cjs)). Traefik sits in front and owns
TLS, routing, compression and the generic security headers. There is no nginx
and no application container: production HTML is served by
[scripts/server.mjs](./scripts/server.mjs), an Express wrapper around the Astro
build.

### Processes

1. **Production (`gmjo-web`)** — `scripts/server.mjs` under pm2, port `4322`.
   Runs in **cluster mode with 2 instances**, which is what makes zero-downtime
   deploys possible: the pm2 master owns the listening socket, so during a
   `pm2 reload` an old worker keeps serving until its replacement has signalled
   ready. With a single instance there is nothing to overlap with and every
   deploy would drop requests. Serves the release that `current` points at (see
   [Build flow](#build-flow)).

2. **Preview (`gmjo-preview`)** — `npm run dev` under pm2, port `4321` (set
   via `server.port` in `astro.config.mjs`). Hybrid SSR via
   `@astrojs/node`: most routes are prerendered at startup, the
   `[lang]/[...slug].astro` route is SSR (`export const prerender = false`) so
   Directus edits show up on next page load with no rebuild. Editors use this
   for the visual editor (`?visual-editing=true`).

3. **Webhook receiver (`gmjo-webhook`)** — `scripts/webhook-receiver.mjs` under
   pm2, default port `4400`. Reads `WEBHOOK_TOKEN` (and other env) from
   [.env](./.env) via Node's native `--env-file` flag (set as
   `interpreter_args` in the pm2 config). Endpoints:
   - `POST /rebuild` — bearer-token auth, in-flight mutex (returns `409` if a
     build is running), returns `202` immediately and runs
     `scripts/deploy.sh` in the background.
   - `GET /status` — auth-required; returns `inFlight` flag plus the last
     build's result.
   - `GET /health` — unauthenticated liveness check for the receiver itself.
     Not to be confused with the production server's `/_health`, below.

### The production server

`@astrojs/node` is configured with `mode: 'middleware'`, so the build emits a
`server/entry.mjs` that exports a `handler` instead of starting its own server.
`scripts/server.mjs` wraps it in Express, layered to reproduce what the old
nginx config did:

| Layer | Path        | Behaviour                                                                                      |
| ----- | ----------- | ---------------------------------------------------------------------------------------------- |
| 0     | `/_health`  | Release name, resolved build dir, pid, uptime. `no-store`. Does not touch Directus.            |
| 1     | redirects   | 302s from [redirects.config.mjs](./redirects.config.mjs)                                       |
| 2     | `/_astro/*` | `public, max-age=31536000, immutable`; a miss is a genuine `404`, not passed to SSR            |
| 3     | `try_files` | Prerendered HTML (`no-cache`) and `/public` assets (`max-age=3600`), with clean-URL resolution |
| 4     | SSR         | `handler` — `prerender = false` routes and `/api/*`                                            |
| 5     | fallback    | `/404.html` if present                                                                         |

Layer 3 exists because in middleware mode the adapter's handler calls `next()`
for prerendered routes rather than serving them, so resolving `/en/about` to
`en/about/index.html` is ours to do. It uses `res.sendFile`, so ETag,
`Last-Modified`, conditional `304`s and Range requests come for free.

Traefik must supply `compress` plus `contentTypeNosniff` and `referrerPolicy` —
the Node server sets only the CSP, because `server.headers` in
`astro.config.mjs` applies to the dev server only, and without it Directus can
no longer iframe production.

#### Why redirects are not left to Astro

Astro's `computeRedirectStatus` only honours an explicit `status` when a
route's internal `redirectRoute` is resolved, which never happens for plain
path-to-path redirects. It therefore emits `301` and silently ignores
`status: 302`, even though the value is stored correctly in the build manifest.
A permanent redirect on `/` is cached by browsers indefinitely and would make
these landing paths very hard to change later, so `scripts/server.mjs`
intercepts them ahead of the SSR handler and issues real 302s.
[redirects.config.mjs](./redirects.config.mjs) is the single source of truth,
imported by both `astro.config.mjs` (so `astro dev` still knows about them) and
the production server. Unlike the old nginx `return 302`, query strings survive
the hop, so `/?visual-editing=true` keeps the editor flag.

### Build flow

A POST from a Directus Flow (or manual `npm run deploy`) runs
[scripts/deploy.sh](./scripts/deploy.sh):

1. Build into `releases/staging-<timestamp>/` using
   `node scripts/build-static.mjs --out-dir <staging>` — the SSG variant:
   [scripts/build-static.mjs](./scripts/build-static.mjs) swaps in
   [src/page-variants/slug-static.astro](./src/page-variants/slug-static.astro)
   (which has `getStaticPaths`) over the SSR `[...slug].astro`, runs
   `astro build`, then restores the SSR file in a `finally` block (a `.ssr.bak`
   next to the route during the build). The build still emits
   `server/entry.mjs`, so `/api/*` and any remaining SSR routes keep working —
   you get prerendered HTML _and_ a live server.
2. On success, rename staging to `releases/<timestamp>/`.
3. **Preflight**: boot the new release on port `4399` and fetch `/_health` and
   `/en`. If either fails, `current` is never touched and the deploy aborts —
   a broken build is invisible to visitors. This step is not optional
   paranoia: a release that fails to boot otherwise takes the site down
   completely, and pm2 reports the reload as successful while both workers
   land in `errored`.
4. Atomically repoint `current` at the new release: `ln -sfn` to a temp name,
   then `mv -Tf` over the old link. Plain `ln -sfn` is _not_ atomic when the
   target exists — it unlinks first, leaving a window where `current` does not
   resolve.
5. `pm2 reload gmjo-web --update-env`. Because `BUILD_DIR=./current` is fixed
   in the pm2 env, no env changes are needed: Node re-resolves the symlink when
   it spawns each new worker. A running process does **not** pick up a symlink
   swap on its own — the reload is mandatory.
6. Poll `/_health` until it reports the new release name. Asserting on the
   release (not merely a `200`) is what distinguishes "the new build is live"
   from "the old workers are still happily serving the previous release". On
   timeout, `current` is repointed at the previous release and reloaded.
7. Garbage-collect: keep the last `KEEP_RELEASES` (default 5) timestamped
   release dirs, never deleting the live one.

Build logs go to `logs/build-<timestamp>.log`. Failed builds are removed;
failed _releases_ are kept for inspection.

Manual rollback:

```bash
ln -sfn releases/<older> current.tmp && mv -Tf current.tmp current
pm2 reload gmjo-web
curl -s localhost:4322/_health   # confirm the release name changed
```

Environment overrides: `KEEP_RELEASES`, `PM2`, `APP_NAME`, `HEALTH_URL`,
`HEALTH_RETRIES`, `PREFLIGHT_PORT`.

### Ports

| Port | Process          | Notes                                                                      |
| ---- | ---------------- | -------------------------------------------------------------------------- |
| 4321 | `gmjo-preview`   | astro dev's default; set explicitly in `astro.config.mjs`                  |
| 4322 | `gmjo-web`       | production; set in `ecosystem.config.cjs`, default in `scripts/server.mjs` |
| 4399 | deploy preflight | transient, only while `deploy.sh` validates a release                      |
| 4400 | `gmjo-webhook`   | `WEBHOOK_PORT` in `.env`                                                   |

Preview and production run side by side on the same host, so Traefik needs to
route `gmjo.at` → `4322` and `preview.gmjo.at` → `4321`.

Ports for the two Astro processes are deliberately **not** in `.env`:
`.env` is shared by all three processes, so a single `PORT` key there is
ambiguous, and for `gmjo-web` it would be ineffective anyway — pm2's `env`
block takes precedence over `.env` (see below). Process-level config belongs in
`ecosystem.config.cjs`. `WEBHOOK_PORT` stays in `.env` because the receiver is
the only consumer of it.

### Where the secrets live

[.env](./.env) holds `DIRECTUS_URL`, `DIRECTUS_TOKEN`, `WEBHOOK_TOKEN`. The
webhook receiver picks them up via Node's `--env-file`; the astro preview
process picks them up via Astro's built-in `import.meta.env`. Subprocess
inheritance carries them through to `astro build` during a deploy.

`gmjo-web` is the exception: it calls `process.loadEnvFile()` inside
`scripts/server.mjs` instead of using `--env-file`. Passing that flag through
pm2's `interpreter_args` in **cluster** mode makes every worker exit instantly
with no log output whatsoever. Fork mode tolerates it, which is why
`gmjo-webhook` still uses the flag. Precedence is preserved: pm2's `env` block
beats `.env`.

Never commit `.env` — it's in [.gitignore](./.gitignore) along with `dist/`,
`releases/`, `logs/`, `current`, and the `*.ssr.bak` transient files.

### Wiring a Directus Flow

Manual trigger on the relevant collection → "Webhook / Request URL" operation:

- URL: `http://<host>:4400/rebuild` (from inside docker-compose use
  `host.docker.internal:4400` or the host gateway IP)
- Method: `POST`
- Headers: `Authorization: Bearer <WEBHOOK_TOKEN>`
- Optional body: `{ "triggered_by": "{{$accountability.user}}" }` — the
  receiver logs this.

### Operational notes

- **First run on a host**: `pm2 start ecosystem.config.cjs --only gmjo-web`
  then `pm2 save`. `deploy.sh` falls back to `start` if the app is unknown to
  the pm2 daemon, so a deploy also bootstraps it.
- **`dist/` is local-only now.** Production serves `current` →
  `releases/<timestamp>/`, and `deploy.sh` never writes `dist/`. Running
  `npm run build` or `npm run build:static` on the prod host is therefore no
  longer dangerous, but it is still wasted work.
- **`npm start`** runs the production server against `dist/` (`BUILD_DIR`
  defaults to `dist`) on port 4322, which is how to reproduce production
  behaviour locally. It can run at the same time as `npm run dev` on 4321.
  `astro preview` no longer works in middleware mode.
- **`Astro.url` is `http://` behind Traefik.** The adapter derives the protocol
  from `req.socket.encrypted` and ignores `X-Forwarded-Proto`. `server.mjs`
  shims this by flipping the socket flag when `X-Forwarded-Proto: https` is
  present (opt out with `TRUST_FORWARDED_PROTO=false`), but prefer
  `Astro.site` for anything absolute — canonical links, sitemap entries, OG
  tags.
- **`keepAliveTimeout` is 185s**, just above Traefik's default 180s
  `idleTimeout`. If Node's is lower, it can close a pooled connection exactly
  as Traefik reuses it, producing intermittent 502s. Override with
  `KEEPALIVE_TIMEOUT_MS` if the Traefik setting changes.
- The webhook receiver is the only thing that should write to `releases/` or
  `current` in production.
- If editors need pre-publication review, point them at the preview SSR
  instance (`gmjo-preview`) — production reflects only what's been Published in
  Directus _and_ deployed via a webhook trigger.

### Verified behaviour

Measured on this setup rather than assumed:

- 1200 requests at ~50/s spanning a live `pm2 reload`: 1200/1200 `200`, new
  pid, new release. Reload took ~4.3s.
- Cache tiers: `/_astro/*` immutable + `304` on revalidation; HTML `no-cache`;
  `/public` assets `max-age=3600`; `/_astro/<missing>` → `404`.
- Redirects: `/` → `/en`, `/en/home` → `/en`, `/de/home` → `/de`, all `302`,
  with query strings preserved.
- `gmjo-preview` on 4321 and the production server on 4322 bound
  simultaneously without collision, both serving `200`.
- Preflight rejects a release with a missing `entry.mjs` and leaves the live
  site untouched.
- `pm2 reload` does recover an app already in `errored`, so the rollback path
  works without `pm2 restart`.

Not yet exercised end-to-end: a full `scripts/deploy.sh` run, because
`cms.gmjo.at` was unreachable at the time of writing and prerendering fails
without it. The script is syntax-checked and its `preflight` was tested in
isolation against both a good and a broken release.
