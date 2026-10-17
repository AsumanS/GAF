// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { site } from './src/config/site.ts';

// https://astro.build/config
export default defineConfig({
  site: site.siteUrl || undefined,
  output: 'static',
  trailingSlash: 'never',
  server: {
    port: 4321,
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  redirects: {
    '/projects/lost-stories': '/projects/hidden-works',
  },
  build: {
    // Keep production builds lean for Cloudflare Pages.
    inlineStylesheets: 'auto',
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      strictPort: true,
      // Avoid serving a stale donate HTML shell after local form changes.
      headers: {
        'Cache-Control': 'no-store',
      },
      // Local Stripe/form API lives on wrangler (`wrangler dev`, port 8787).
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8787',
          changeOrigin: true,
        },
      },
    },
    build: {
      sourcemap: false,
    },
  },
});