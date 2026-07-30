import type { APIRoute } from 'astro';
import { absoluteUrl, site } from '../config/site';

export const GET: APIRoute = () => {
  const sitemapLine = site.siteUrl
    ? `Sitemap: ${absoluteUrl('/sitemap.xml')}`
    : 'Sitemap: /sitemap.xml';

  const body = `User-agent: *
Allow: /

${sitemapLine}
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
