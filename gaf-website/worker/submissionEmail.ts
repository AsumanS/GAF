import type { Env } from './env';
import { createSignedSubmissionFileUrl } from './submissionFiles';

export const GMAIL_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
export const NOTIFICATION_MAILBOX = 'goldenarchivefoundation@gmail.com';

const OMITTED_PAYLOAD_KEYS = new Set([
  'object_key',
  'cf-turnstile-response',
  'submission_idempotency_key',
  'client_secret',
  'client_id',
  'refresh_token',
  'access_token',
  'submission_file_link_secret',
  'gmail_client_secret',
  'gmail_refresh_token',
]);

export type StoredSubmissionRow = {
  id: string;
  form_type: string;
  status: string;
  legal_name: string;
  email: string;
  payload_json: string;
  agreement_version?: string | null;
};

export type StoredNotificationFile = {
  id: string;
  field_name: string;
  original_filename: string;
  size_bytes: number | null;
  object_key?: string;
  content_type?: string;
};

type GmailCredentials = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

function credentialsFromEnv(env: Env): GmailCredentials {
  return {
    clientId: env.GMAIL_CLIENT_ID,
    clientSecret: env.GMAIL_CLIENT_SECRET,
    refreshToken: env.GMAIL_REFRESH_TOKEN,
  };
}

export function buildGmailRefreshTokenRequest(credentials: GmailCredentials): Request {
  const body = new URLSearchParams();
  body.set('client_id', credentials.clientId);
  body.set('client_secret', credentials.clientSecret);
  body.set('refresh_token', credentials.refreshToken);
  body.set('grant_type', 'refresh_token');
  return new Request(GMAIL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function buildGmailSendRequest(accessToken: string, rfc2822: string): Request {
  const raw = bytesToBase64Url(new TextEncoder().encode(rfc2822));
  return new Request(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });
}

export function humanizeFieldName(key: string): string {
  return key
    .replace(/\[\]/g, '')
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${trimOneDecimal(kilobytes)} KB`;
  return `${trimOneDecimal(kilobytes / 1024)} MB`;
}

function trimOneDecimal(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, '');
}

function sanitizeHeader(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\u0000]/g, '')
    .trim();
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export function volunteerNotificationSubject(legalName: string, submissionId: string): string {
  return `[Volunteer Application] ${sanitizeHeader(legalName)} — ${sanitizeHeader(submissionId)}`;
}

export function hiddenWorksNotificationSubject(
  workTitle: string,
  legalName: string,
  submissionId: string,
): string {
  const title = workTitle.trim() || legalName.trim() || 'Submission';
  return `[Hidden Works Submission] ${sanitizeHeader(title)} — ${sanitizeHeader(submissionId)}`;
}

function encodeRfc2047(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  const bytes = new TextEncoder().encode(value);
  const words: string[] = [];
  let index = 0;
  while (index < bytes.length) {
    let end = Math.min(index + 45, bytes.length);
    while (end > index && end < bytes.length && (bytes[end]! & 0xc0) === 0x80) {
      end -= 1;
    }
    if (end === index) end = Math.min(index + 45, bytes.length);
    words.push(`=?UTF-8?B?${bytesToBase64(bytes.subarray(index, end))}?=`);
    index = end;
  }
  return words.join('\r\n ');
}

function wrapBase64(value: string): string {
  const lines: string[] = [];
  for (let i = 0; i < value.length; i += 76) {
    lines.push(value.slice(i, i + 76));
  }
  return lines.join('\r\n');
}

function parsePayload(payloadJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(payloadJson) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Stored text is still summarized from the submission row.
  }
  return {};
}

function readString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === 'string' ? value.trim() : '';
}

function indent(text: string, spaces: number): string {
  if (!text) return '';
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line ? pad + line : line))
    .join('\n');
}

function formatPayloadValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    const scalar = value.every(
      (item) =>
        item === null ||
        item === undefined ||
        ['string', 'number', 'boolean'].includes(typeof item),
    );
    if (scalar) {
      return value.map((item) => `- ${item ?? ''}`).join('\n');
    }
    return value
      .map((item, index) => {
        const rendered =
          item && typeof item === 'object'
            ? formatPayloadObject(item as Record<string, unknown>)
            : formatPayloadValue(item);
        return `${index + 1}.\n${indent(rendered, 2)}`;
      })
      .join('\n');
  }
  if (typeof value === 'object') {
    return formatPayloadObject(value as Record<string, unknown>);
  }
  return '';
}

function formatPayloadObject(record: Record<string, unknown>): string {
  return Object.entries(record)
    .filter(([key]) => !OMITTED_PAYLOAD_KEYS.has(key))
    .map(([key, value]) => formatField(key, value))
    .filter(Boolean)
    .join('\n');
}

function formatField(key: string, value: unknown): string {
  if (OMITTED_PAYLOAD_KEYS.has(key)) return '';
  const label = humanizeFieldName(key);
  const rendered = formatPayloadValue(value);
  if (!rendered.includes('\n')) return `${label}: ${rendered}`;
  return `${label}:\n${indent(rendered, 2)}`;
}

function submissionTypeLabel(formType: string): string {
  if (formType === 'volunteer') return 'Volunteer';
  if (formType === 'hidden_works') return 'Hidden Works';
  return formType;
}

export function notificationSubject(
  submission: StoredSubmissionRow,
  payload: Record<string, unknown>,
): string {
  if (submission.form_type === 'hidden_works') {
    return hiddenWorksNotificationSubject(
      readString(payload, 'work_title'),
      submission.legal_name,
      submission.id,
    );
  }
  return volunteerNotificationSubject(submission.legal_name, submission.id);
}

export async function buildSubmissionEmail(
  secret: string,
  submission: StoredSubmissionRow,
  files: StoredNotificationFile[],
  now: Date = new Date(),
): Promise<{ subject: string; body: string; rfc2822: string }> {
  const payload = parsePayload(submission.payload_json);
  const subject = notificationSubject(submission, payload);
  const summary = [
    `Submission type: ${submissionTypeLabel(submission.form_type)}`,
    `Submission ID: ${oneLine(submission.id)}`,
    `Received status: ${oneLine(submission.status)}`,
    `Applicant: ${oneLine(submission.legal_name)}`,
    `Applicant email: ${oneLine(submission.email)}`,
  ];
  if (submission.agreement_version) {
    summary.push(`Agreement version: ${oneLine(submission.agreement_version)}`);
  }
  if (submission.form_type === 'hidden_works') {
    const workTitle = readString(payload, 'work_title') || submission.legal_name;
    summary.push(`Work title: ${oneLine(workTitle)}`);
    summary.push(`Entry type: ${oneLine(readString(payload, 'entry_type'))}`);
    summary.push(`Competition category: ${oneLine(readString(payload, 'competition_category'))}`);
  }

  const payloadText = formatPayloadObject(payload);
  const fileLines = ['FILES', '-----'];
  if (files.length === 0) {
    fileLines.push('No files uploaded.');
  } else {
    for (const file of files) {
      const signed = await createSignedSubmissionFileUrl(file.id, secret, now);
      fileLines.push(humanizeFieldName(file.field_name));
      fileLines.push(`Original filename: ${oneLine(file.original_filename)}`);
      fileLines.push(`Size: ${formatFileSize(file.size_bytes ?? 0)}`);
      fileLines.push(`Download: ${signed.url}`);
      fileLines.push(`Expires: ${new Date(signed.expiresUnix * 1000).toISOString()}`);
      fileLines.push('');
    }
  }

  const body = [summary.join('\n'), payloadText, fileLines.join('\n').trimEnd()]
    .filter(Boolean)
    .join('\n\n');
  const rfc2822 = [
    `From: Golden Archive Foundation <${NOTIFICATION_MAILBOX}>`,
    `To: ${NOTIFICATION_MAILBOX}`,
    `Reply-To: ${sanitizeHeader(submission.email)}`,
    `Subject: ${encodeRfc2047(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(bytesToBase64(new TextEncoder().encode(body))),
  ].join('\r\n');

  return { subject, body, rfc2822 };
}

export async function deliverGmailMessage(env: Env, rfc2822: string): Promise<void> {
  const tokenResponse = await fetch(buildGmailRefreshTokenRequest(credentialsFromEnv(env)));
  if (!tokenResponse.ok) {
    throw new Error('gmail_auth_failed');
  }
  const tokenJson = (await tokenResponse.json()) as { access_token?: unknown };
  if (typeof tokenJson.access_token !== 'string' || !tokenJson.access_token) {
    throw new Error('gmail_auth_failed');
  }

  const sendResponse = await fetch(buildGmailSendRequest(tokenJson.access_token, rfc2822));
  if (!sendResponse.ok) {
    throw new Error('gmail_send_failed');
  }
}

export async function sendSubmissionNotification(
  env: Env,
  submissionId: string,
  now: Date = new Date(),
): Promise<void> {
  const submission = await env.SUBMISSIONS_DB.prepare(
    `SELECT id, form_type, status, legal_name, email, payload_json, agreement_version
     FROM submissions
     WHERE id = ?
     LIMIT 1`,
  )
    .bind(submissionId)
    .first<StoredSubmissionRow>();

  if (!submission) return;

  const fileResult = await env.SUBMISSIONS_DB.prepare(
    `SELECT id, field_name, original_filename, size_bytes
     FROM submission_files
     WHERE submission_id = ?`,
  )
    .bind(submissionId)
    .all<StoredNotificationFile>();

  const built = await buildSubmissionEmail(
    env.SUBMISSION_FILE_LINK_SECRET,
    submission,
    fileResult.results ?? [],
    now,
  );
  await deliverGmailMessage(env, built.rfc2822);
}

export function scheduleSubmissionNotification(
  ctx: ExecutionContext | undefined,
  env: Env,
  submissionId: string,
): void {
  if (!ctx) return;
  ctx.waitUntil(
    sendSubmissionNotification(env, submissionId).catch(() => {
      // Best-effort. Do not log PII, payloads, or credentials.
    }),
  );
}
