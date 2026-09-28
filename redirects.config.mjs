/**
 * Single source of truth for the site's path redirects.
 *
 * Consumed by:
 *   - astro.config.mjs   -> so `astro dev` and route generation know about them
 *   - scripts/server.mjs -> serves them in production, as real 302s
 *
 * Why production doesn't rely on Astro: @astrojs/node hands redirect routes to
 * Astro's `computeRedirectStatus`, which only honours an explicit `status` when
 * the route's internal `redirectRoute` is resolved. For plain path-to-path
 * redirects like these it is always undefined, so Astro hardcodes 301 and
 * silently ignores `status: 302`. A permanent redirect on `/` is cached by
 * browsers indefinitely, which would make these landing paths very hard to
 * change later (see the commented-out '/en' -> '/en/goals' below), so
 * scripts/server.mjs intercepts them ahead of the SSR handler instead.
 */

/** @type {302} */
export const REDIRECT_STATUS = 302;

/** @type {Record<string, string>} */
export const redirects = {
  '/': '/en',
  '/en/home': '/en',
  '/de/home': '/de',
  // '/en': '/en/goals',
};

/** The shape `astro.config.mjs` expects. */
export const astroRedirects = Object.fromEntries(
  Object.entries(redirects).map(([from, destination]) => [
    from,
    { status: REDIRECT_STATUS, destination },
  ]),
);
