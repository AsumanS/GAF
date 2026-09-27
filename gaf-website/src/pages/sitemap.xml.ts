import type { APIRoute } from 'astro';
import { absoluteUrl } from '../config/site';

const paths = [
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
  const urls = paths
    .map(
      (path) => `  <url>
    <loc>${absoluteUrl(path)}</loc>
    <changefreq>monthly</changefreq>
  </url>`,
    )
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
