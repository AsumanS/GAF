import type { Env } from './env';
import { handleHiddenWorksSubmit } from './forms/hiddenWorks';
import { handleVolunteerSubmit } from './forms/volunteer';
import { jsonResponse } from './forms/common';
import { handleSubmissionFileDownload } from './submissionFiles';

export type { Env };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const fileMatch = /^\/api\/submission-files\/([^/]+)$/.exec(url.pathname);
      if (fileMatch?.[1]) {
        let fileId = fileMatch[1];
        try {
          fileId = decodeURIComponent(fileId);
        } catch {
          return new Response('Not found', {
            status: 404,
            headers: { 'Cache-Control': 'private, no-store' },
          });
        }
        return handleSubmissionFileDownload(request, env, fileId);
      }
      if (url.pathname === '/api/forms/volunteer') {
        return handleVolunteerSubmit(request, env, ctx);
      }
      if (url.pathname === '/api/forms/hidden-works') {
        return handleHiddenWorksSubmit(request, env, {}, ctx);
      }

      return jsonResponse(404, {
        success: false,
        error: 'invalid_submission',
      });
    }

    return env.ASSETS.fetch(request);
  },
};
