import type { Env } from './env';
import { jsonResponse } from './forms/common';
import {
  buildPlainTextNotificationRfc2822,
  deliverGmailMessage,
} from './submissionEmail';

export type InternalErrorFormType = 'hidden_works' | 'volunteer' | 'api';

export type InternalErrorReportInput = {
  formType: InternalErrorFormType;
  stage: string;
  request: Request;
  error: unknown;
  submissionId?: string;
};

const MAX_MESSAGE_CHARS = 2_000;
const MAX_STACK_CHARS = 8_000;
const MAX_CAUSE_CHARS = 1_000;

export function newIncidentId(): string {
  try {
    return `ERR-${crypto.randomUUID()}`;
  } catch {
    // Non-sensitive fallback if UUID generation is unavailable.
    return `ERR-fallback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function formTypeLabel(formType: string): string {
  if (formType === 'hidden_works') return 'Hidden Works';
  if (formType === 'volunteer') return 'Volunteer';
  if (formType === 'api') return 'API';
  return formType;
}

export function secretValuesFromEnv(env: Env): string[] {
  return [
    env.GMAIL_CLIENT_ID,
    env.GMAIL_CLIENT_SECRET,
    env.GMAIL_REFRESH_TOKEN,
    env.SUBMISSION_FILE_LINK_SECRET,
    env.TURNSTILE_SECRET_KEY,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);
}

export function truncateDiagnostic(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}…[truncated]`;
}

/** Conservative email redaction for defense-in-depth on diagnostic strings only. */
export function redactEmails(text: string): string {
  return text.replace(
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    '[REDACTED_EMAIL]',
  );
}

export function redactSecrets(text: string, secrets: string[]): string {
  let out = text;
  const ordered = [...secrets].filter(Boolean).sort((a, b) => b.length - a.length);
  for (const secret of ordered) {
    out = out.split(secret).join('[REDACTED]');
  }
  out = out.replace(/\bBearer\s+[A-Za-z0-9._\-+=/]+/gi, 'Bearer [REDACTED]');
  out = out.replace(/\bya29\.[A-Za-z0-9._\-]+/g, '[REDACTED]');
  out = out.replace(
    /\b(?:access_token|refresh_token)\s*[:=]\s*["']?[A-Za-z0-9._\-+=/]+["']?/gi,
    '[REDACTED_TOKEN]',
  );
  out = redactEmails(out);
  return out;
}

export function extractErrorParts(error: unknown): {
  name: string;
  message: string;
  stack: string;
  causeName: string;
  causeMessage: string;
  causeStack: string;
} {
  if (error instanceof Error) {
    const cause =
      error.cause instanceof Error
        ? error.cause
        : error.cause !== undefined && error.cause !== null
          ? new Error(String(error.cause))
          : null;
    return {
      name: error.name || 'Error',
      message: error.message || '',
      stack: typeof error.stack === 'string' ? error.stack : '',
      causeName: cause?.name || '',
      causeMessage: cause?.message || '',
      causeStack: cause && typeof cause.stack === 'string' ? cause.stack : '',
    };
  }
  return {
    name: typeof error === 'string' ? 'Error' : Object.prototype.toString.call(error),
    message: typeof error === 'string' ? error : 'non_error_throw',
    stack: '',
    causeName: '',
    causeMessage: '',
    causeStack: '',
  };
}

function safeRequestMeta(request: Request): {
  method: string;
  pathname: string;
  hostname: string;
  cfRay: string;
} {
  try {
    const url = new URL(request.url);
    return {
      method: request.method,
      pathname: url.pathname,
      hostname: url.hostname,
      cfRay: request.headers.get('CF-Ray') ?? '',
    };
  } catch {
    return {
      method: request.method,
      pathname: '',
      hostname: '',
      cfRay: request.headers.get('CF-Ray') ?? '',
    };
  }
}

export function buildInternalErrorSubject(
  formType: string,
  stage: string,
  incidentId: string,
): string {
  return `[GAF ERROR] ${formTypeLabel(formType)} — ${stage} — ${incidentId}`;
}

export function buildInternalErrorEmailBody(input: {
  incidentId: string;
  formType: string;
  stage: string;
  request: Request;
  error: unknown;
  submissionId?: string;
  now?: Date;
  secrets: string[];
}): string {
  const now = input.now ?? new Date();
  const meta = safeRequestMeta(input.request);
  const parts = extractErrorParts(input.error);
  const redact = (value: string, max: number) =>
    truncateDiagnostic(redactSecrets(value, input.secrets), max);

  const lines = [
    `Incident ID: ${input.incidentId}`,
    `UTC timestamp: ${now.toISOString()}`,
    `Form type: ${input.formType}`,
    `Stage: ${input.stage}`,
    `HTTP method: ${meta.method}`,
    `Request pathname: ${meta.pathname}`,
    `Request hostname: ${meta.hostname}`,
  ];
  if (meta.cfRay) lines.push(`CF-Ray: ${meta.cfRay}`);
  if (input.submissionId) lines.push(`Submission ID: ${input.submissionId}`);
  lines.push(`Exception name: ${redact(parts.name, MAX_CAUSE_CHARS)}`);
  lines.push(`Exception message: ${redact(parts.message, MAX_MESSAGE_CHARS)}`);
  if (parts.causeName || parts.causeMessage || parts.causeStack) {
    lines.push(`Exception cause name: ${redact(parts.causeName, MAX_CAUSE_CHARS)}`);
    lines.push(`Exception cause message: ${redact(parts.causeMessage, MAX_CAUSE_CHARS)}`);
    if (parts.causeStack) {
      lines.push('Exception cause stack:');
      lines.push(redact(parts.causeStack, MAX_STACK_CHARS));
    }
  }
  if (parts.stack) {
    lines.push('Exception stack:');
    lines.push(redact(parts.stack, MAX_STACK_CHARS));
  }
  return lines.join('\n');
}

export function buildInternalErrorConsolePayload(input: {
  incidentId: string;
  formType: string;
  stage: string;
  request: Request;
  error: unknown;
  submissionId?: string;
  secrets: string[];
}): Record<string, string> {
  const meta = safeRequestMeta(input.request);
  const parts = extractErrorParts(input.error);
  const redact = (value: string, max: number) =>
    truncateDiagnostic(redactSecrets(value, input.secrets), max);
  const payload: Record<string, string> = {
    marker: 'internal_error',
    incident_id: input.incidentId,
    form_type: input.formType,
    stage: input.stage,
    method: meta.method,
    pathname: meta.pathname,
    hostname: meta.hostname,
    exception_name: redact(parts.name, MAX_CAUSE_CHARS),
    exception_message: redact(parts.message, MAX_MESSAGE_CHARS),
  };
  if (meta.cfRay) payload.cf_ray = meta.cfRay;
  if (input.submissionId) payload.submission_id = input.submissionId;
  if (parts.stack) payload.exception_stack = redact(parts.stack, MAX_STACK_CHARS);
  if (parts.causeName) payload.cause_name = redact(parts.causeName, MAX_CAUSE_CHARS);
  if (parts.causeMessage) payload.cause_message = redact(parts.causeMessage, MAX_CAUSE_CHARS);
  if (parts.causeStack) payload.cause_stack = redact(parts.causeStack, MAX_STACK_CHARS);
  return payload;
}

async function sendInternalErrorEmail(
  env: Env,
  incidentId: string,
  stage: string,
  subject: string,
  body: string,
): Promise<void> {
  try {
    const rfc2822 = buildPlainTextNotificationRfc2822(subject, body);
    await deliverGmailMessage(env, rfc2822);
  } catch {
    console.error(
      JSON.stringify({
        marker: 'internal_error_email_failed',
        incident_id: incidentId,
        stage,
      }),
    );
  }
}

/**
 * Schedules a safe developer diagnostic report. Never throws into the form request.
 * Incident ID is for internal email/console correlation only — never expose to clients.
 */
export function scheduleInternalErrorReport(
  ctx: ExecutionContext | undefined,
  env: Env,
  input: InternalErrorReportInput,
): string {
  let incidentId = 'ERR-unknown';
  try {
    incidentId = newIncidentId();
    const secrets = secretValuesFromEnv(env);
    const subject = buildInternalErrorSubject(input.formType, input.stage, incidentId);
    const body = buildInternalErrorEmailBody({
      incidentId,
      formType: input.formType,
      stage: input.stage,
      request: input.request,
      error: input.error,
      submissionId: input.submissionId,
      secrets,
    });
    console.error(
      JSON.stringify(
        buildInternalErrorConsolePayload({
          incidentId,
          formType: input.formType,
          stage: input.stage,
          request: input.request,
          error: input.error,
          submissionId: input.submissionId,
          secrets,
        }),
      ),
    );

    const task = sendInternalErrorEmail(env, incidentId, input.stage, subject, body);
    if (ctx) {
      ctx.waitUntil(task);
    } else {
      void task;
    }
  } catch {
    try {
      console.error(
        JSON.stringify({
          marker: 'internal_error_report_failed',
          incident_id: incidentId,
          stage: input.stage,
        }),
      );
    } catch {
      // Never throw from diagnostics.
    }
  }
  return incidentId;
}

export function internalFailureResponse(
  ctx: ExecutionContext | undefined,
  env: Env,
  request: Request,
  formType: InternalErrorFormType,
  stage: string,
  error: unknown,
  submissionId?: string,
): Response {
  try {
    scheduleInternalErrorReport(ctx, env, {
      formType,
      stage,
      request,
      error,
      submissionId,
    });
  } catch {
    // scheduleInternalErrorReport is required to be no-throw; belt-and-suspenders.
  }
  return jsonResponse(500, {
    success: false,
    error: 'submission_failed',
  });
}
