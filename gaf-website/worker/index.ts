import type { Env } from './env';
import {
  extractErrorParts,
  redactSecrets,
  secretValuesFromEnv,
  truncateDiagnostic,
} from './errorNotification';
import { handleHiddenWorksSubmit } from './forms/hiddenWorks';
import { handleVolunteerSubmit } from './forms/volunteer';
import { jsonResponse } from './forms/common';
import { handleSubmissionFileDownload } from './submissionFiles';

export type { Env };

function logUnhandledApi(env: Env, request: Request, error: unknown): void {
  try {
    const secrets = secretValuesFromEnv(env);
    const parts = extractErrorParts(error);
    let pathname = '';
    let hostname = '';
    try {
      const url = new URL(request.url);
      pathname = url.pathname;
      hostname = url.hostname;
    } catch {
      // ignore
    }
    console.error(
      JSON.stringify({
        marker: 'unhandled_api',
        form_type: 'api',
        stage: 'unhandled_api',
        method: request.method,
        pathname,
        hostname,
        exception_name: truncateDiagnostic(redactSecrets(parts.name, secrets), 1_000),
        exception_message: truncateDiagnostic(redactSecrets(parts.message, secrets), 2_000),
      }),
    );
  } catch {
    // Never throw from diagnostics.
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      try {
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
          return await handleSubmissionFileDownload(request, env, fileId);
        }
        if (url.pathname === '/api/forms/volunteer') {
          return await handleVolunteerSubmit(request, env, ctx);
        }
        if (url.pathname === '/api/forms/hidden-works') {
          return await handleHiddenWorksSubmit(request, env, {}, ctx);
        }

        return jsonResponse(404, {
          success: false,
          error: 'invalid_submission',
        });
      } catch (error) {
        // Console-only fallback: form handlers already email for their caught failures.
        logUnhandledApi(env, request, error);
        return jsonResponse(500, {
          success: false,
          error: 'submission_failed',
        });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
