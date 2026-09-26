import type { Env } from './env';
import { methodNotAllowed } from './forms/common';

/** Private R2 downloads. The bucket is never public; the URL is a bearer link. */
export const SUBMISSION_FILE_LINK_ORIGIN = 'https://goldenarchivefoundation.org';
export const SUBMISSION_FILE_LINK_TTL_SECONDS = 7 * 24 * 60 * 60;
/** Small clock skew so a freshly issued 7-day link is not treated as excessive. */
const EXPIRY_SKEW_SECONDS = 60;

export type FileLinkVerification =
  | { ok: true; expiresUnix: number }
  | { ok: false; reason: 'malformed' | 'expired' | 'excessive' | 'invalid' };

type StoredFileRow = {
  object_key: string;
  original_filename: string;
  content_type: string;
  size_bytes: number | null;
};

export function unixSeconds(now: Date): number {
  return Math.floor(now.getTime() / 1000);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padded =
    value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  const length = Math.max(left.length, right.length);
  let diff = left.length === right.length ? 0 : 1;
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

function signingMessage(fileId: string, expiresUnix: number): string {
  return `${fileId}\n${expiresUnix}`;
}

export async function signSubmissionFileLink(
  fileId: string,
  expiresUnix: number,
  secret: string,
): Promise<string> {
  const key = await importHmacKey(secret);
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingMessage(fileId, expiresUnix)),
  );
  return bytesToBase64Url(new Uint8Array(mac));
}

export function parseExpiry(raw: string | null): number | null {
  if (!raw || !/^[1-9]\d*$/.test(raw) || raw.length > 15) return null;
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) return null;
  return value;
}

export async function verifySubmissionFileLink(
  fileId: string,
  expiresRaw: string | null,
  signatureRaw: string | null,
  secret: string,
  now: Date = new Date(),
): Promise<FileLinkVerification> {
  const expiresUnix = parseExpiry(expiresRaw);
  if (expiresUnix === null || !signatureRaw) {
    return { ok: false, reason: 'malformed' };
  }

  const nowSeconds = unixSeconds(now);
  if (expiresUnix <= nowSeconds) {
    return { ok: false, reason: 'expired' };
  }
  if (expiresUnix > nowSeconds + SUBMISSION_FILE_LINK_TTL_SECONDS + EXPIRY_SKEW_SECONDS) {
    return { ok: false, reason: 'excessive' };
  }

  const expected = await signSubmissionFileLink(fileId, expiresUnix, secret);
  const provided = decodeBase64Url(signatureRaw);
  const expectedBytes = decodeBase64Url(expected);
  if (!provided || !expectedBytes || !timingSafeEqual(expectedBytes, provided)) {
    return { ok: false, reason: 'invalid' };
  }
  return { ok: true, expiresUnix };
}

export async function createSignedSubmissionFileUrl(
  fileId: string,
  secret: string,
  now: Date = new Date(),
): Promise<{ url: string; expiresUnix: number }> {
  const expiresUnix = unixSeconds(now) + SUBMISSION_FILE_LINK_TTL_SECONDS;
  const signature = await signSubmissionFileLink(fileId, expiresUnix, secret);
  const url =
    `${SUBMISSION_FILE_LINK_ORIGIN}/api/submission-files/${encodeURIComponent(fileId)}` +
    `?expires=${expiresUnix}&signature=${encodeURIComponent(signature)}`;
  return { url, expiresUnix };
}

export function contentDispositionAttachment(filename: string): string {
  const noControls = filename.replace(/[\u0000\r\n]/g, '');
  const quoted = noControls.replace(/["\\]/g, '');
  const ascii = quoted.replace(/[^\x20-\x7E]/g, '_');
  const fallback = ascii.trim() || 'download';
  const star = encodeURIComponent(noControls).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${star}`;
}

function safeContentType(value: string): string {
  const mediaType = value.split(';')[0]?.trim().toLowerCase() ?? '';
  if (/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(mediaType)) {
    return mediaType;
  }
  return 'application/octet-stream';
}

function isSafeFileId(fileId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fileId);
}

function privateResponse(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

export async function handleSubmissionFileDownload(
  request: Request,
  env: Env,
  fileId: string,
  now: Date = new Date(),
): Promise<Response> {
  if (request.method !== 'GET') {
    return methodNotAllowed('GET');
  }
  if (!isSafeFileId(fileId)) {
    return privateResponse(404, 'Not found');
  }

  const url = new URL(request.url);
  const verified = await verifySubmissionFileLink(
    fileId,
    url.searchParams.get('expires'),
    url.searchParams.get('signature'),
    env.SUBMISSION_FILE_LINK_SECRET,
    now,
  );
  if (!verified.ok) {
    return privateResponse(403, 'Forbidden');
  }

  const row = await env.SUBMISSIONS_DB.prepare(
    `SELECT object_key, original_filename, content_type, size_bytes
     FROM submission_files
     WHERE id = ?
     LIMIT 1`,
  )
    .bind(fileId)
    .first<StoredFileRow>();

  if (!row?.object_key) {
    return privateResponse(404, 'Not found');
  }

  const object = await env.SUBMISSION_FILES.get(row.object_key);
  if (!object) {
    return privateResponse(404, 'Not found');
  }

  const headers = new Headers();
  headers.set('Content-Type', safeContentType(row.content_type ?? ''));
  headers.set(
    'Content-Disposition',
    contentDispositionAttachment(row.original_filename || 'download'),
  );
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Content-Type-Options', 'nosniff');

  return new Response(object.body, { status: 200, headers });
}
