import type { APIRoute } from 'astro';
import { absoluteUrl, site } from '../config/site';

const routes = [
  '/',
  '/about',
  '/projects',
  '/projects/hidden-works',
  '/projects/hidden-works/submit',
  '/projects/worlds',
  '/volunteer',
  '/transparency',
  '/contact',
  '/donate',
  '/privacy',
  '/accessibility',
  '/terms',
];

export const GET: APIRoute = () => {
  const urls = routes
    .map((path) => {
      const loc = site.siteUrl ? absoluteUrl(path) : path;
      return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>monthly</changefreq>\n  </url>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
