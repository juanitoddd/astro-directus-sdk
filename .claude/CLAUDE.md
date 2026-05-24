# Project Overview

Astro (version 6) frontend that consumes data from directus headless CMS using the `directus SDK` [documentation](https://directus.io/docs/guides/connect/sdk) and display the content in two languages, english `en` and german `de`. The pages have sections that contain the translated content.

## Detailed description
In Directus there is a collection called `page` which represent webpages. Each page is composed by "sections". "Sections" can be items of following collections `block`, `grid`, `hero` or `slider` using a collection relationship of type "many to any". using `sort` field as sorting.

The sections `block`, `grid` and `hero` have translations with a field called `content`.

Each `page` is set into the dynamic route `src/pages/[lang]/[...slug].astro`

A `slider` is a container of "slides" of type `block`, `grid` or `hero` following the same "many to any" relationship with them. So that you can have a slider of grid, hero or block.

This skill is used to create, review, or refactor Astro components that consume Directus page data, including handling of sections, its items, and translations.

## Page sections
In directus, there are different content types which compose the sections of the page.

Section types:

- **Block**: A simple content component. It uses the "block editor" JSON output. Translated field `content`
- **Grid**: A two column layout where each column has the "block editor" JSON output. Translated field `content`
- **Hero**: A Simple bakcground image with a title and description. Translated field `content`

- **Slider**: A collection of `block`, `grid` or `hero` .No translations. Just container for other content types: `block`, `grid` and `hero` using the `sort` field as sorting.

Each of these sections can be translated, and the page can have multiple blocks of each type. When creating or refactoring Astro components to consume this data, consider the following:

## URL structure

The pages should be accessed with their `slug` field and the URL should have the language, for example "/en/about" or "/de/projects"

## Considerations

1. Under `./src/lib/directus` create or update a query file that takes care of each of these sections, and make sure to include the necessary fields and translations in the query. Then, create or update Astro components that consume this data and render it appropriately, keeping in mind the structure of the data and the need for translations.

2. `page` do not have translations, they act as container for the sections, and the sections are the ones that have the translations. For fetching of "blocks", "grids" and "hero" do take the translations, as they are the ones that have the content.

3. Create necesary types for each of the sections and place it on `./src/lib/directus/types` and make sure to use them in the queries and components.

4. "slider" content type has many items, it acs as a container, using a `sort` numberic field as sorting. So for this sections make the query accordingly, so it fetches the translated items content.


## Astro Components

Each section should have its own Astro component that takes care of rendering the data appropriately. For example, a "Block" component that takes the block data and renders it using the "block editor" JSON output, a "Grid" component that takes the grid data and renders it in a two column layout (using CSS tailwind `grid grid-col-2`), a "Hero" component that takes the hero data and renders it with a background image, and a translated `content` (also "block editor" JSON type), and a "Slider" component takes an array of `hero`, `blocks`or `grid` and renders them in a navigable slider.

Place them under `./web/src/components/directus`

## Navigation

The navigation items should be built dynamically. In directus there is a collection called `menu` which has a one to many relationship with the collection `menu_item` and a field `slug` to identify it. `menu_item` has a `url` field and a translations field called `label`.

Under `./lib/directus/` should be also a folder `menu` where queries and logic regarding fetching a menu by `slug`. This logic should be consumed by a component called `Menu` where the links to the url and the label are build. 

## Language Switcher

There should also be a component under `./web/src/components/layout` that handles the language switch and mantains the page but the sections have their correspondent translations while keeping the URL structure with the language prefix `en` or `de`. I have build util functions under `./src/lib/i18n.ts` to achieve this, update or modify them if needed.

## Glossary
- **Block editor**: Block-styled editor for rich media stories, outputs clean data in JSON using Editor.js

## Deployment architecture

The site runs as three decoupled processes. Preview and webhook receiver are bare-metal Node managed by pm2 (see [ecosystem.config.cjs](../ecosystem.config.cjs)); production HTML is served by an nginx container that mounts the build output.

### Processes

1. **Preview (`gmjo-preview`)** — `npm run dev` under pm2. Hybrid SSR via `@astrojs/node`: most routes are prerendered at startup, the `[lang]/[...slug].astro` route is SSR (`export const prerender = false`) so Directus edits show up on next page load with no rebuild. Editors use this for the visual editor (`?visual-editing=true`).

2. **Webhook receiver (`gmjo-webhook`)** — `scripts/webhook-receiver.mjs` under pm2. Express server, default port `4400`. Reads `WEBHOOK_TOKEN` (and other env) from [.env](../.env) via Node's native `--env-file` flag (set as `interpreter_args` in the pm2 config). Endpoints:
   - `POST /rebuild` — bearer-token auth, in-flight mutex (returns `409` if a build is running), returns `202` immediately and runs `scripts/deploy.sh` in the background.
   - `GET /status` — auth-required; returns `inFlight` flag plus the last build's result.
   - `GET /health` — unauthenticated liveness check.

3. **Production nginx** — containerised, configured by [deploy/nginx.conf](../deploy/nginx.conf). Bind-mounts `web/dist` (a symlink — see below) as the document root. Serves pure static HTML, encodes the redirects from astro.config.mjs as 302s at the edge, and applies tiered cache headers (`/_astro/*` immutable, media short-cache, HTML `no-cache`).

### Build flow

A POST from a Directus Flow (or manual `npm run deploy`) runs [scripts/deploy.sh](../scripts/deploy.sh):

1. Build into `releases/staging-<timestamp>/` using `node scripts/build-static.mjs --out-dir <staging>` — this is the SSG variant: [scripts/build-static.mjs](../scripts/build-static.mjs) swaps in [src/page-variants/slug-static.astro](../src/page-variants/slug-static.astro) (which has `getStaticPaths`) over the SSR `[...slug].astro`, runs `astro build`, then restores the SSR file in a `finally` block (a `.ssr.bak` next to the route during the build).
2. On success, rename staging to `releases/<timestamp>/` and atomically update the `dist` symlink to point at it (`ln -sfn` is atomic on Linux when replacing a symlink). On a fresh checkout where `dist` is a real directory, the script removes it once before creating the symlink.
3. On failure, the staging dir is removed and the previous release stays live — `dist` never points at a half-built site.
4. Garbage-collect: keep the last `KEEP_RELEASES` (default 5) timestamped release dirs for rollback. Rollback is `ln -sfn releases/<older> dist`.

Build logs go to `logs/build-<timestamp>.log`.

### Where the secrets live

[.env](../.env) holds `DIRECTUS_URL`, `DIRECTUS_TOKEN`, `WEBHOOK_TOKEN`. The webhook receiver picks them up via Node's `--env-file`; the astro preview process picks them up via Astro's built-in `import.meta.env`. Subprocess inheritance carries them through to `astro build` during a deploy. Never commit `.env` — it's in [.gitignore](../.gitignore) along with `dist/`, `releases/`, `logs/`, and the `*.ssr.bak` transient files.

### Wiring a Directus Flow

Manual trigger on the relevant collection → "Webhook / Request URL" operation:

- URL: `http://<host>:4400/rebuild` (from inside docker-compose use `host.docker.internal:4400` or the host gateway IP)
- Method: `POST`
- Headers: `Authorization: Bearer <WEBHOOK_TOKEN>`
- Optional body: `{ "triggered_by": "{{$accountability.user}}" }` — the receiver logs this.

### Operational notes

- The webhook receiver is the only thing that should write to `dist/` or `releases/` in production. Don't run `npm run build:static` directly on the prod host — it writes to `dist/` unconditionally, which would clobber the served release.
- nginx follows symlinks, so the atomic swap is invisible to in-flight requests.
- If editors need pre-publication review, point them at the preview SSR instance (`gmjo-preview`) — production reflects only what's been Published in Directus *and* deployed via a webhook trigger.



