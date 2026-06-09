// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  experimental: {
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: "GTEestiProText",
      cssVariable: "--font-GTEestiProText",
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/GTEestiProText-Bold.ttf'],
            weight: '700',
            style: 'normal'
          },
          {
            src: ['./src/assets/fonts/GTEestiProText-Medium.ttf'],
            weight: '500',
            style: 'normal'
          },
          {
            src: ['./src/assets/fonts/GTEestiProText-Regular.ttf'],
            weight: 'normal',
            style: 'normal'
          },
          {
            src: ['./src/assets/fonts/GTEestiProText-Thin.ttf'],
            weight: '300',
            style: 'normal'
          },
          {
            src: ['./src/assets/fonts/GTEestiProText-Light.ttf'],
            weight: '200',
            style: 'normal'
          },          
          {
            src: ['./src/assets/fonts/GTEestiProText-UltraLight.ttf'],
            weight: '100',
            style: 'normal'
          }
        ]
      }
    },
    {
      provider: fontProviders.google(),
      name: "Playfair",
      cssVariable: "--font-playfair-display"
    },
    {
      provider: fontProviders.google(),
      name: "Roboto",
      cssVariable: "--font-roboto"
    },
    {
      provider: fontProviders.google(),
      name: "Montserrat",
      cssVariable: "--font-montserrat"
    },
  ],
  adapter: node({
    mode: 'standalone',
  }),
  vite: {
    plugins: [tailwindcss()]
  },
  i18n: {
    locales: ["en", "de", "it"],
    defaultLocale: "en",
  },

  integrations: [react()],
  redirects: {
    "/": "/en",
    "/en/home": "/en",
    "/de/home": "/de",
    // "/en": "/en/goals",
  },
  server: {
    allowedHosts: ["preview.uponthe.top", "cms.uponthe.top"],
    headers: {
      // Do not set X-Frame-Options to DENY or SAMEORIGIN if another origin must embed this app.
      // Prefer CSP frame-ancestors for fine-grained control:
      'Content-Security-Policy': "frame-ancestors 'self' cms.uponthe.top preview.uponthe.top",
    },
  }
});