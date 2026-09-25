import type { Env } from './env';
import { handleHiddenWorksSubmit } from './forms/hiddenWorks';
import { handleVolunteerSubmit } from './forms/volunteer';
import { jsonResponse } from './forms/common';

export type { Env };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/forms/volunteer') {
        return handleVolunteerSubmit(request, env);
      }
      if (url.pathname === '/api/forms/hidden-works') {
        return handleHiddenWorksSubmit(request, env);
      }

      return jsonResponse(404, {
        success: false,
        error: 'invalid_submission',
      });
    }

    return env.ASSETS.fetch(request);
  },
};
