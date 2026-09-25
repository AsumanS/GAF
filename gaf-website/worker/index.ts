export interface Env {
  ASSETS: Fetcher;
  SUBMISSIONS_DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return new Response('API route not implemented yet', {
        status: 404,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
