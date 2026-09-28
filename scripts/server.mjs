#!/usr/bin/env node
/**
 * Production server for the Astro build (adapter `node`, mode `middleware`).
 *
 * Replaces deploy/nginx.conf. Traefik stays in front and owns TLS, routing,
 * compression and the generic security headers; this process owns static file
 * serving and cache policy, because path semantics are application knowledge.
 *
 * Layering (mirrors the old nginx `location` blocks, in order):
 *   1. redirects      -> 302s, ahead of everything (nginx did these at the edge)
 *   2. /_astro/*      -> fingerprinted assets, 1y immutable, 404 if missing
 *   3. try_files      -> prerendered HTML + /public assets, tiered cache
 *   4. ssrHandler     -> SSR routes
 *   5. 404 fallback   -> /404.html
 *
 * Why step 2 exists: in middleware mode the adapter's handler calls `next()`
 * for prerendered routes instead of serving them (see
 * @astrojs/node/dist/serve-app.js), so clean-URL resolution is ours to do.
 *
 * Env:
 *   ENV_FILE               dotenv file to load (default: <repo>/.env)
 *   BUILD_DIR              build root containing server/ + client/ (default: dist)
 *   HOST, PORT             listen address (default: 0.0.0.0:4322)
 *   TRUST_FORWARDED_PROTO  honour X-Forwarded-Proto (default: true)
 *   KEEPALIVE_TIMEOUT_MS   must exceed Traefik's idleTimeout (default: 185000)
 */
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REDIRECT_STATUS, redirects } from '../redirects.config.mjs';

// Env is loaded here rather than via node's `--env-file` flag, because passing
// that flag through pm2's `interpreter_args` makes cluster-mode workers exit
// immediately with no log output. Resolved relative to this file so it does
// not depend on the cwd pm2 happens to use.
const ENV_FILE =
  process.env.ENV_FILE ?? fileURLToPath(new URL('../.env', import.meta.url));
if (fs.existsSync(ENV_FILE)) {
  // `--env-file` lets a real environment variable win over the file;
  // loadEnvFile overwrites, so restore the pre-existing values to keep the
  // old precedence (pm2's `env` block beats .env).
  const preexisting = { ...process.env };
  process.loadEnvFile(ENV_FILE);
  Object.assign(process.env, preexisting);
}

const BUILD_DIR = path.resolve(process.env.BUILD_DIR ?? 'dist');
const CLIENT_DIR = path.join(BUILD_DIR, 'client');
const SERVER_ENTRY = path.join(BUILD_DIR, 'server', 'entry.mjs');

const HOST = process.env.HOST ?? '0.0.0.0';
// 4322, not 4321: gmjo-preview (astro dev) owns 4321 and the two run side by
// side, in production and locally.
const PORT = Number(process.env.PORT ?? 4322);
const TRUST_FORWARDED_PROTO = process.env.TRUST_FORWARDED_PROTO !== 'false';
const KEEPALIVE_TIMEOUT_MS = Number(process.env.KEEPALIVE_TIMEOUT_MS ?? 185_000);

// Cache tiers, copied verbatim from deploy/nginx.conf.
const CACHE_IMMUTABLE = 'public, max-age=31536000, immutable';
const CACHE_SHORT = 'public, max-age=3600';
const CACHE_NONE = 'no-cache';

// astro.config.mjs `server.headers` only applies to the dev server, so the
// production CSP has to be set here or Directus can no longer iframe the site.
const CSP_FRAME_ANCESTORS =
  "frame-ancestors 'self' gmjo.at cms.gmjo.at preview.gmjo.at";

for (const required of [SERVER_ENTRY, CLIENT_DIR]) {
  if (!fs.existsSync(required)) {
    console.error(
      `[server] missing ${required}\n` +
        `[server] run a build first, or point BUILD_DIR at a release dir.`,
    );
    process.exit(1);
  }
}

// Resolved once, at startup. BUILD_DIR is a symlink in production, so this is
// what lets the deploy script verify that a reload actually picked up the new
// release rather than silently keeping the old one alive.
const RESOLVED_BUILD_DIR = fs.realpathSync(BUILD_DIR);
const RELEASE = path.basename(RESOLVED_BUILD_DIR);

const { handler: ssrHandler } = await import(pathToFileURL(SERVER_ENTRY).href);

const app = express();
app.disable('x-powered-by');
// `send` (used by sendFile) generates strong ETags from size+mtime already;
// Express's own weak ETag layer would only add work for SSR responses.
app.set('etag', false);

// ---------- Forwarded proto ----------
// The node adapter builds Astro.url from `req.socket.encrypted` and ignores
// X-Forwarded-Proto, so behind Traefik's TLS termination every Astro.url comes
// out as http://. Flipping the flag on the socket is the least invasive fix:
// the socket is per-connection and every request on it arrives from the same
// proxy hop, so there's no cross-request leakage.
if (TRUST_FORWARDED_PROTO) {
  app.use((req, _res, next) => {
    const proto = req.headers['x-forwarded-proto'];
    const first = Array.isArray(proto) ? proto[0] : proto?.split(',')[0]?.trim();
    if (first === 'https' && req.socket && !req.socket.encrypted) {
      req.socket.encrypted = true;
    }
    next();
  });
}

app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP_FRAME_ANCESTORS);
  next();
});

// ---------- 0. Health ----------
// Deliberately does not touch Directus: it answers "is this process serving,
// and from which release", which is exactly what a deploy gate needs.
app.get('/_health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    status: 'ok',
    release: RELEASE,
    buildDir: RESOLVED_BUILD_DIR,
    pid: process.pid,
    uptime: Math.round(process.uptime()),
  });
});

// ---------- 1. Redirects ----------
// Handled here rather than by Astro: `computeRedirectStatus` only honours an
// explicit status when a route's internal `redirectRoute` is resolved, which
// never happens for plain path-to-path redirects, so Astro would emit 301.
app.use((req, res, next) => {
  const destination = redirects[req.path];
  if (!destination) return next();

  // Query strings survive the hop so that e.g. /?visual-editing=true still
  // reaches the editor. nginx's `return 302` dropped them.
  const queryIndex = req.originalUrl.indexOf('?');
  const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';

  res.setHeader('Cache-Control', CACHE_NONE);
  res.redirect(REDIRECT_STATUS, `${destination}${query}`);
});

// ---------- 2. Fingerprinted assets ----------
// Hashed filenames, so a miss is a genuine 404 rather than something the SSR
// app should try to render (nginx: `try_files $uri =404`).
app.use(
  '/_astro',
  express.static(path.join(CLIENT_DIR, '_astro'), {
    index: false,
    redirect: false,
    fallthrough: false,
    // `setHeaders` runs after send computes its own Cache-Control, so this
    // wins - keeping all three cache tiers set explicitly from the constants.
    setHeaders: (res) => res.setHeader('Cache-Control', CACHE_IMMUTABLE),
  }),
);

// ---------- 3. Prerendered HTML + /public assets ----------
/** Resolve a URL path to a file on disk, mirroring nginx `try_files`. */
function resolveStaticFile(pathname) {
  const candidates = [];
  if (pathname.endsWith('/')) {
    candidates.push(`${pathname}index.html`);
  } else if (path.extname(pathname)) {
    candidates.push(pathname);
  } else {
    // Astro's default build.format is 'directory'; keep the `.html` variant as
    // a fallback so this also works if build.format is switched to 'file'.
    candidates.push(`${pathname}/index.html`, `${pathname}.html`);
  }

  for (const candidate of candidates) {
    const abs = path.resolve(CLIENT_DIR, `.${candidate}`);
    // Containment check: reject anything that escaped CLIENT_DIR.
    if (abs !== CLIENT_DIR && !abs.startsWith(CLIENT_DIR + path.sep)) continue;
    try {
      if (fs.statSync(abs).isFile()) return abs;
    } catch {
      // ENOENT - try the next candidate.
    }
  }
  return undefined;
}

function sendStatic(req, res, next, file, { status } = {}) {
  // HTML must revalidate so editors see published changes immediately after a
  // deploy; everything else (favicons, /public images, fonts) gets a short TTL.
  res.setHeader(
    'Cache-Control',
    file.endsWith('.html') ? CACHE_NONE : CACHE_SHORT,
  );
  if (status) res.status(status);
  res.sendFile(
    file,
    {
      cacheControl: false, // we set Cache-Control ourselves, above
      dotfiles: req.path.startsWith('/.well-known/') ? 'allow' : 'ignore',
    },
    (err) => {
      if (!err) return;
      // Client aborted mid-stream: nothing to report.
      if (res.headersSent) return res.destroy();
      next(err);
    },
  );
}

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();

  let pathname;
  try {
    pathname = decodeURIComponent(req.path);
  } catch {
    return next(); // malformed percent-encoding; let the app deal with it
  }

  const file = resolveStaticFile(pathname);
  if (!file) return next();
  sendStatic(req, res, next, file);
});

// ---------- 4. SSR ----------
// Handles `export const prerender = false` routes and /api/*.
app.use(ssrHandler);

// ---------- 5. 404 fallback ----------
app.use((req, res, next) => {
  const file = resolveStaticFile('/404.html');
  if (!file) return res.status(404).type('txt').send('Not Found');
  sendStatic(req, res, next, file, { status: 404 });
});

// ---------- Lifecycle ----------
const server = app.listen(PORT, HOST, () => {
  console.log(`[server] listening on ${HOST}:${PORT}`);
  console.log(`[server] serving release ${RELEASE} (${RESOLVED_BUILD_DIR})`);
  // Lets pm2 use `wait_ready: true` so a reload only retires the old worker
  // once this one can actually accept traffic.
  process.send?.('ready');
});

// Must outlive the proxy's idle timeout, otherwise Node can close a pooled
// connection at the same moment Traefik reuses it -> sporadic 502s.
server.keepAliveTimeout = KEEPALIVE_TIMEOUT_MS;
server.headersTimeout = KEEPALIVE_TIMEOUT_MS + 1_000;

let shuttingDown = false;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[server] ${signal} - draining connections`);
    server.close(() => process.exit(0));
    // Backstop: pm2's kill_timeout will SIGKILL us anyway, but exiting
    // cleanly first keeps the logs honest.
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
