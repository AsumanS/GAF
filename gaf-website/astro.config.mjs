// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { site } from './src/config/site.ts';

// https://astro.build/config
export default defineConfig({
  site: site.siteUrl || undefined,
  output: 'static',
  trailingSlash: 'never',
  redirects: {
    '/projects/lost-stories': '/projects/hidden-works',
  },
  build: {
    // Keep production builds lean for Cloudflare Pages.
    inlineStylesheets: 'auto',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      sourcemap: false,
    },
  },
});
