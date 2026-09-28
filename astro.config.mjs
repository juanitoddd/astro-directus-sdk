// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';
import { astroRedirects } from './redirects.config.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://gmjo.at',
  experimental: {
    incrementalBuild: true,
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'GTEestiProText',
      cssVariable: '--font-GTEestiProText',
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/GTEestiProText-Bold.ttf'],
            weight: '700',
            style: 'normal',
          },
          {
            src: ['./src/assets/fonts/GTEestiProText-Medium.ttf'],
            weight: '500',
            style: 'normal',
          },
          {
            src: ['./src/assets/fonts/GTEestiProText-Regular.ttf'],
            weight: 'normal',
            style: 'normal',
          },
          {
            src: ['./src/assets/fonts/GTEestiProText-Thin.ttf'],
            weight: '300',
            style: 'normal',
          },
          {
            src: ['./src/assets/fonts/GTEestiProText-Light.ttf'],
            weight: '200',
            style: 'normal',
          },
          {
            src: ['./src/assets/fonts/GTEestiProText-UltraLight.ttf'],
            weight: '100',
            style: 'normal',
          },
        ],
      },
    },
    {
      provider: fontProviders.google(),
      name: 'Playfair',
      cssVariable: '--font-playfair-display',
    },
    {
      provider: fontProviders.google(),
      name: 'Roboto',
      cssVariable: '--font-roboto',
    },
    {
      provider: fontProviders.google(),
      name: 'Montserrat',
      cssVariable: '--font-montserrat',
    },
  ],
  // Middleware mode: the build emits `server/entry.mjs` exporting `handler`,
  // and `scripts/server.mjs` wraps it in Express so we control static file
  // serving and Cache-Control tiers (what deploy/nginx.conf used to do).
  adapter: node({
    mode: 'middleware',
  }),
  vite: {
    plugins: [tailwindcss()],
  },
  /*
  i18n: {
    locales: ['en', 'de', 'it'],
    defaultLocale: 'en',
  },
  */
  integrations: [react()],
  // Defined in redirects.config.mjs, shared with scripts/server.mjs. Note that
  // Astro emits these as 301 regardless of the `status` given here, so in
  // production scripts/server.mjs serves them as 302s before the SSR handler.
  redirects: astroRedirects,
  server: {
    // Dev/preview port, stated explicitly rather than relying on astro's 4321
    // default: production (scripts/server.mjs) runs on 4322 on the same host,
    // and the split needs to be obvious from config rather than implied.
    port: 4321,
    allowedHosts: ['gmjo.at', 'preview.gmjo.at', 'cms.gmjo.at', 'localhost'],
    headers: {
      // Do not set X-Frame-Options to DENY or SAMEORIGIN if another origin must embed this app.
      // Prefer CSP frame-ancestors for fine-grained control:
      'Content-Security-Policy':
        "frame-ancestors 'self' gmjo.at cms.gmjo.at preview.gmjo.at",
    },
  },
});
