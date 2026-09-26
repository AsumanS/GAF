import { afterEach, describe, expect, it } from 'vitest';
import type { Env } from '../worker/env';
import { handleHiddenWorksSubmit } from '../worker/forms/hiddenWorks';
import { HIDDEN_WORKS_TURNSTILE_ACTION } from '../worker/forms/hiddenWorks';
import { VOLUNTEER_TURNSTILE_ACTION } from '../worker/forms/common';
import { handleVolunteerSubmit } from '../worker/forms/volunteer';
import worker from '../worker/index';
import {
  buildGmailRefreshTokenRequest,
  buildGmailSendRequest,
  buildSubmissionEmail,
  deliverGmailMessage,
  GMAIL_SEND_URL,
  GMAIL_TOKEN_URL,
  NOTIFICATION_MAILBOX,
  type StoredNotificationFile,
  type StoredSubmissionRow,
} from '../worker/submissionEmail';
import {
  SUBMISSION_FILE_LINK_ORIGIN,
  SUBMISSION_FILE_LINK_TTL_SECONDS,
  contentDispositionAttachment,
  createSignedSubmissionFileUrl,
  handleSubmissionFileDownload,
  signSubmissionFileLink,
  verifySubmissionFileLink,
} from '../worker/submissionFiles';

const CLIENT_ID = 'test-gmail-client-id';
const CLIENT_SECRET = 'test-gmail-client-secret-value';
const REFRESH_TOKEN = 'test-gmail-refresh-token-value';
const HMAC_SECRET = 'test-hmac-secret-value';
const OBJECT_KEY = 'private/r2/object-key-not-for-email';
const FILE_BYTES = 'private-file-bytes-marker';
const FILE_ID = '550e8400-e29b-41d4-a716-446655440000';
const NOW = new Date('2026-09-26T12:00:00.000Z');

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function words(count: number): string {
  return Array.from({ length: count }, (_, index) => `word${index}`).join(' ');
}

function decodeBase64Url(value: string): string {
  const padded =
    value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decodeRfc2047(value: string): string {
  const unfolded = value.replace(/\r\n[ \t]+/g, '');
  return unfolded.replace(/=\?UTF-8\?B\?([A-Za-z0-9+/=]+)\?=/gi, (_match, b64: string) => {
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  });
}

function headerValue(rfc2822: string, name: string): string {
  const headers = rfc2822.split('\r\n\r\n')[0] ?? '';
  const unfolded: string[] = [];
  for (const line of headers.split('\r\n')) {
    if (/^[ \t]/.test(line) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }
  const prefix = `${name.toLowerCase()}:`;
  const found = unfolded.find((line) => line.toLowerCase().startsWith(prefix));
  return found ? found.slice(name.length + 1).trim() : '';
}

function decodeMimeBody(rfc2822: string): string {
  const encoded = (rfc2822.split('\r\n\r\n')[1] ?? '').replace(/\r\n/g, '');
  const binary = atob(encoded);
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

type FileRow = {
  id: string;
  submission_id?: string;
  field_name: string;
  original_filename: string;
  object_key: string;
  content_type: string;
  size_bytes: number;
};

type SubmissionRow = StoredSubmissionRow;

function createDb(state: {
  idempotencyId?: string | null;
  files: FileRow[];
  submissions: Map<string, SubmissionRow>;
}) {
  function prepare(sql: string) {
    const args: unknown[] = [];
    const statement = {
      sql,
      args,
      bind(...bound: unknown[]) {
        args.push(...bound);
        return statement;
      },
      async first<T>(): Promise<T | null> {
        if (sql.includes('idempotency_key')) {
          return (state.idempotencyId ? { id: state.idempotencyId } : null) as T | null;
        }
        if (sql.includes('COUNT(DISTINCT')) {
          return { cnt: 0 } as T;
        }
        if (sql.includes('payload_json') && sql.includes('WHERE id = ?')) {
          return (state.submissions.get(String(args[0])) ?? null) as T | null;
        }
        if (sql.includes('FROM submission_files') && sql.includes('WHERE id = ?')) {
          return (state.files.find((file) => file.id === args[0]) ?? null) as T | null;
        }
        return null;
      },
      async all<T>() {
        if (sql.includes('FROM submission_files')) {
          return {
            results: state.files.filter((file) => file.submission_id === args[0]) as T[],
          };
        }
        return { results: [] as T[] };
      },
      async run() {
        if (sql.includes('INSERT INTO submission_files')) {
          const [id, submissionId, fieldName, originalFilename, objectKey, contentType, sizeBytes] =
            args;
          state.files.push({
            id: String(id),
            submission_id: String(submissionId),
            field_name: String(fieldName),
            original_filename: String(originalFilename),
            object_key: String(objectKey),
            content_type: String(contentType),
            size_bytes: Number(sizeBytes),
          });
        }
        return { success: true };
      },
    };
    return statement;
  }

  return {
    prepare,
    async batch(statements: Array<{ sql: string; args: unknown[] }>) {
      for (const statement of statements) {
        if (!statement.sql.includes('INSERT INTO submissions')) continue;
        if (statement.sql.includes("'volunteer'")) {
          const [id, legalName, email, payloadJson, , agreementVersion] = statement.args;
          state.submissions.set(String(id), {
            id: String(id),
            form_type: 'volunteer',
            status: 'received',
            legal_name: String(legalName),
            email: String(email),
            payload_json: String(payloadJson),
            agreement_version: String(agreementVersion),
          });
        } else {
          const [id, formType, legalName, email, payloadJson, , agreementVersion] = statement.args;
          state.submissions.set(String(id), {
            id: String(id),
            form_type: String(formType),
            status: 'received',
            legal_name: String(legalName),
            email: String(email),
            payload_json: String(payloadJson),
            agreement_version: String(agreementVersion),
          });
        }
      }
      return [];
    },
  };
}

function createBucket(options: { failPut?: boolean } = {}) {
  const objects = new Map<string, Uint8Array>();
  return {
    objects,
    putCount: 0,
    async put(key: string, value: ReadableStream | ArrayBuffer | Uint8Array | Blob) {
      this.putCount += 1;
      if (options.failPut) throw new Error('r2 put failed');
      let bytes: Uint8Array;
      if (value instanceof ReadableStream) {
        const reader = value.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          chunks.push(next.value as Uint8Array);
        }
        const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
        bytes = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
      } else if (value instanceof Uint8Array) {
        bytes = value;
      } else if (value instanceof ArrayBuffer) {
        bytes = new Uint8Array(value);
      } else {
        bytes = new Uint8Array(await value.arrayBuffer());
      }
      objects.set(key, bytes);
    },
    async get(key: string) {
      const body = objects.get(key);
      if (!body) return null;
      return { body };
    },
    async delete() {
      return undefined;
    },
  };
}

function createEnv(db: ReturnType<typeof createDb>, bucket: ReturnType<typeof createBucket>): Env {
  return {
    ASSETS: {
      fetch: async () => {
        throw new Error('assets should not serve submission files');
      },
    } as unknown as Env['ASSETS'],
    SUBMISSIONS_DB: db as unknown as Env['SUBMISSIONS_DB'],
    SUBMISSION_FILES: bucket as unknown as Env['SUBMISSION_FILES'],
    TURNSTILE_SECRET_KEY: 'turnstile-test-secret',
    GMAIL_CLIENT_ID: CLIENT_ID,
    GMAIL_CLIENT_SECRET: CLIENT_SECRET,
    GMAIL_REFRESH_TOKEN: REFRESH_TOKEN,
    SUBMISSION_FILE_LINK_SECRET: HMAC_SECRET,
  };
}

type FetchCall = { url: string; authorization: string | null; body: string };

function installFetch(
  action: string,
  hostname: string,
  gmail: { fail: boolean; gate: Promise<void> },
) {
  const calls: FetchCall[] = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const body = await request.text();
    calls.push({
      url: request.url,
      authorization: request.headers.get('authorization'),
      body,
    });
    if (request.url.includes('challenges.cloudflare.com')) {
      return Response.json({ success: true, action, hostname });
    }
    if (request.url === GMAIL_TOKEN_URL || request.url === GMAIL_SEND_URL) {
      await gmail.gate;
      if (request.url === GMAIL_TOKEN_URL) {
        return Response.json({ access_token: 'ya29.test-access-token' });
      }
      if (gmail.fail) return new Response('gmail failed', { status: 500 });
      return Response.json({ id: 'msg-1' });
    }
    throw new Error(`unexpected fetch ${request.url}`);
  };
  return calls;
}

function createCtx() {
  const tasks: Promise<unknown>[] = [];
  return {
    tasks,
    ctx: {
      waitUntil(promise: Promise<unknown>) {
        tasks.push(promise);
      },
      passThroughOnException() {
        return undefined;
      },
    } as ExecutionContext,
  };
}

function volunteerRequest(): Request {
  const form = new FormData();
  const fields: Record<string, string> = {
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    phone: '+1 555 0100',
    city: 'London',
    state_region: 'England',
    country: 'United Kingdom',
    time_zone: 'Europe/London',
    age_18_or_older: 'Yes',
    why_volunteer: 'Because archives matter.',
    how_contribute: 'Research support.',
    skills_experience: 'Mathematics and writing.',
    available_start_date: '2026-10-01',
    time_commitment: '5-10 hours / week',
    volunteer_duration: '3-6 months',
    reference_1_name: 'Ref One',
    reference_1_relationship: 'Colleague',
    reference_1_email: 'ref1@example.com',
    reference_1_phone: '+1 555 0101',
    reference_2_name: 'Ref Two',
    reference_2_relationship: 'Mentor',
    reference_2_email: 'ref2@example.com',
    reference_2_phone: '+1 555 0102',
    background_check_willing: 'Yes',
    declare_references_contact: 'yes',
    declare_accuracy: 'yes',
    declare_no_guarantee: 'yes',
    declare_unpaid: 'yes',
    declare_confidentiality: 'yes',
    submission_idempotency_key: 'idem-volunteer',
    'cf-turnstile-response': 'token',
  };
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  form.append('preferred_availability', 'Weekdays');
  form.set('resume', new File([new Uint8Array(32)], 'resume.pdf', { type: 'application/pdf' }));
  return new Request('https://example.com/api/forms/volunteer', {
    method: 'POST',
    headers: { Origin: 'https://example.com' },
    body: form,
  });
}

function hiddenWorksRequest(idempotencyKey: string, withFile: boolean): Request {
  const form = new FormData();
  const fields: Record<string, string> = {
    entry_type: 'Individual',
    legal_first_name: 'Ada',
    legal_last_name: 'Lovelace',
    email: 'ada@example.com',
    phone: '+1 555 0100',
    date_of_birth: '1990-01-15',
    country: 'United States',
    state_region: 'Texas',
    city: 'Austin',
    age_18_or_older: 'Yes',
    public_credit: 'legal_name',
    work_title: 'Example Work',
    author_creator: 'Anonymous',
    original_language: 'Latin',
    country_or_place_of_origin: 'Italy',
    first_publication_date: '1500',
    place_of_first_publication: 'Venice',
    type_of_work: 'Literature / Fiction',
    competition_category: 'Untranslated Discovery',
    category_explain: 'Never published in English for general U.S. readers.',
    publication_evidence: 'Catalog records establish first publication before 1777.',
    primary_bibliographic_source: 'https://example.com/bib',
    bibliographic_citations: 'Example citation.',
    source_access: 'Available at a national library.',
    source_accessible: 'Yes',
    word_count: '45000',
    larger_work: 'No',
    public_domain_why: 'Published before 1777.',
    english_translation_aware: 'No',
    english_edition_us: 'No',
    english_edition_explain: 'No general U.S. English edition found.',
    variants_searched: 'Title variants A and B.',
    sources_searched: 'WorldCat and national catalogs.',
    search_dates_terms: '2026-01-01; title author.',
    apparent_matches: 'None located.',
    match_explain: 'No matches affect eligibility.',
    reader_facing_case: words(500),
    how_discovered: 'Archival research.',
    translation_challenges: 'Classical language.',
    special_components: 'No',
    publication_limitations: 'No',
    conflicts: 'No',
    outside_assistance: 'No',
    key_sources: 'Primary catalogs.',
    typed_legal_name: 'Ada Lovelace',
    agree_eligibility_accuracy: 'yes',
    agree_rights_materials: 'yes',
    agree_contest_administration: 'yes',
    agree_rules_privacy: 'yes',
    submission_idempotency_key: idempotencyKey,
    'cf-turnstile-response': 'token',
  };
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  if (withFile) {
    form.set(
      'supporting_evidence',
      new File([new Uint8Array(16)], 'evidence.pdf', { type: 'application/pdf' }),
    );
  }
  return new Request('https://example.com/api/forms/hidden-works', {
    method: 'POST',
    headers: { Origin: 'https://example.com' },
    body: form,
  });
}

describe('signed submission file links', () => {
  it('creates a canonical link that expires in exactly 7 days and verifies', async () => {
    const { url, expiresUnix } = await createSignedSubmissionFileUrl(FILE_ID, HMAC_SECRET, NOW);
    expect(expiresUnix).toBe(Math.floor(NOW.getTime() / 1000) + SUBMISSION_FILE_LINK_TTL_SECONDS);
    const parsed = new URL(url);
    expect(`${parsed.origin}${parsed.pathname}`).toBe(
      `${SUBMISSION_FILE_LINK_ORIGIN}/api/submission-files/${FILE_ID}`,
    );
    expect(parsed.searchParams.get('expires')).toBe(String(expiresUnix));
    const signature = parsed.searchParams.get('signature');
    expect(signature).toBeTruthy();
    expect(url).not.toContain(HMAC_SECRET);
    expect(url).not.toContain(OBJECT_KEY);

    const verified = await verifySubmissionFileLink(
      FILE_ID,
      String(expiresUnix),
      signature,
      HMAC_SECRET,
      NOW,
    );
    expect(verified).toEqual({ ok: true, expiresUnix });
  });

  it('rejects a signature when the file id or expiry changes', async () => {
    const { expiresUnix, url } = await createSignedSubmissionFileUrl(FILE_ID, HMAC_SECRET, NOW);
    const signature = new URL(url).searchParams.get('signature') ?? '';
    const otherId = '550e8400-e29b-41d4-a716-446655440001';
    expect(
      await verifySubmissionFileLink(otherId, String(expiresUnix), signature, HMAC_SECRET, NOW),
    ).toEqual({ ok: false, reason: 'invalid' });
    expect(
      await verifySubmissionFileLink(
        FILE_ID,
        String(expiresUnix - 10),
        signature,
        HMAC_SECRET,
        NOW,
      ),
    ).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects expired and excessively future links', async () => {
    const past = Math.floor(NOW.getTime() / 1000) - 5;
    const pastSignature = await signSubmissionFileLink(FILE_ID, past, HMAC_SECRET);
    expect(
      await verifySubmissionFileLink(FILE_ID, String(past), pastSignature, HMAC_SECRET, NOW),
    ).toEqual({
      ok: false,
      reason: 'expired',
    });

    const tooFar = Math.floor(NOW.getTime() / 1000) + SUBMISSION_FILE_LINK_TTL_SECONDS + 86_400;
    const futureSignature = await signSubmissionFileLink(FILE_ID, tooFar, HMAC_SECRET);
    expect(
      await verifySubmissionFileLink(FILE_ID, String(tooFar), futureSignature, HMAC_SECRET, NOW),
    ).toEqual({ ok: false, reason: 'excessive' });

    expect(await verifySubmissionFileLink(FILE_ID, 'not-a-time', 'abc', HMAC_SECRET, NOW)).toEqual({
      ok: false,
      reason: 'malformed',
    });
  });

  it('keeps a normal filename in Content-Disposition', () => {
    expect(contentDispositionAttachment('My Resume.pdf')).toContain('filename="My Resume.pdf"');
  });
});

describe('private submission file endpoint', () => {
  function seededEnv() {
    const files: FileRow[] = [
      {
        id: FILE_ID,
        field_name: 'resume',
        original_filename: 'My Resume.pdf',
        object_key: OBJECT_KEY,
        content_type: 'application/pdf',
        size_bytes: new TextEncoder().encode(FILE_BYTES).length,
      },
    ];
    const bucket = createBucket();
    bucket.objects.set(OBJECT_KEY, new TextEncoder().encode(FILE_BYTES));
    const env = createEnv(createDb({ files, submissions: new Map() }), bucket);
    return { env, bucket };
  }

  async function signedRequest(expiresUnix: number, signature: string, fileId = FILE_ID) {
    const url =
      `${SUBMISSION_FILE_LINK_ORIGIN}/api/submission-files/${fileId}` +
      `?expires=${expiresUnix}&signature=${encodeURIComponent(signature)}`;
    return new Request(url, { method: 'GET' });
  }

  it('returns the R2 object only for a valid signature and does not require Origin', async () => {
    const { env } = seededEnv();
    const { expiresUnix, url } = await createSignedSubmissionFileUrl(FILE_ID, HMAC_SECRET, NOW);
    const signature = new URL(url).searchParams.get('signature') ?? '';
    const request = await signedRequest(expiresUnix, signature);
    const response = await worker.fetch(request, env, createCtx().ctx);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(FILE_BYTES);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Disposition')).toContain('filename="My Resume.pdf"');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Content-Disposition')).not.toContain(OBJECT_KEY);
  });

  it('does not return file contents for an invalid signature', async () => {
    const { env } = seededEnv();
    const { expiresUnix } = await createSignedSubmissionFileUrl(FILE_ID, HMAC_SECRET, NOW);
    const request = await signedRequest(expiresUnix, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    const response = await handleSubmissionFileDownload(request, env, FILE_ID, NOW);
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain(FILE_BYTES);
  });

  it('returns 404 when the D1 row or R2 object is missing', async () => {
    const missingId = '550e8400-e29b-41d4-a716-446655440099';
    const { env, bucket } = seededEnv();
    const expiresUnix = Math.floor(NOW.getTime() / 1000) + 3600;
    const missingSignature = await signSubmissionFileLink(missingId, expiresUnix, HMAC_SECRET);
    const missingRow = await handleSubmissionFileDownload(
      await signedRequest(expiresUnix, missingSignature, missingId),
      env,
      missingId,
      NOW,
    );
    expect(missingRow.status).toBe(404);
    expect(await missingRow.text()).not.toContain(OBJECT_KEY);

    bucket.objects.delete(OBJECT_KEY);
    const signature = await signSubmissionFileLink(FILE_ID, expiresUnix, HMAC_SECRET);
    const missingObject = await handleSubmissionFileDownload(
      await signedRequest(expiresUnix, signature),
      env,
      FILE_ID,
      NOW,
    );
    expect(missingObject.status).toBe(404);
    const missingText = await missingObject.text();
    expect(missingText).not.toContain(FILE_BYTES);
    expect(missingText).not.toContain(OBJECT_KEY);
  });
});

describe('gmail notification message', () => {
  it('builds the refresh-token request and sends with the returned access token', async () => {
    const refresh = buildGmailRefreshTokenRequest({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      refreshToken: REFRESH_TOKEN,
    });
    expect(refresh.method).toBe('POST');
    expect(refresh.url).toBe(GMAIL_TOKEN_URL);
    expect(refresh.headers.get('content-type')).toContain('application/x-www-form-urlencoded');
    const params = new URLSearchParams(await refresh.text());
    expect(params.get('client_id')).toBe(CLIENT_ID);
    expect(params.get('client_secret')).toBe(CLIENT_SECRET);
    expect(params.get('refresh_token')).toBe(REFRESH_TOKEN);
    expect(params.get('grant_type')).toBe('refresh_token');

    const calls = installFetch(VOLUNTEER_TURNSTILE_ACTION, 'example.com', {
      fail: false,
      gate: Promise.resolve(),
    });
    const env = createEnv(createDb({ files: [], submissions: new Map() }), createBucket());
    await deliverGmailMessage(env, 'Subject: test\r\n\r\nbody');
    const send = calls.find((call) => call.url === GMAIL_SEND_URL);
    expect(send?.authorization).toBe('Bearer ya29.test-access-token');
    const raw = (JSON.parse(send?.body ?? '{}') as { raw?: string }).raw ?? '';
    expect(decodeBase64Url(raw)).toContain('Subject: test');

    const direct = buildGmailSendRequest('ya29.direct', 'From: test\r\n\r\nhello');
    expect(direct.headers.get('authorization')).toBe('Bearer ya29.direct');
    expect(direct.url).toBe(GMAIL_SEND_URL);
  });

  it('encodes volunteer and hidden works messages without secrets or object keys', async () => {
    const volunteer = await buildSubmissionEmail(
      HMAC_SECRET,
      {
        id: 'VOL-11111111-1111-1111-1111-111111111111',
        form_type: 'volunteer',
        status: 'received',
        legal_name: 'İpek Şahin',
        email: 'ipek@example.com',
        payload_json: JSON.stringify({
          why_volunteer: 'Because archives matter.',
          legal_first_name: 'İpek',
          object_key: OBJECT_KEY,
        }),
        agreement_version: 'volunteer-2026-09-25-v1',
      },
      [
        {
          id: FILE_ID,
          field_name: 'resume',
          original_filename: 'résumé.pdf',
          size_bytes: 2048,
          object_key: OBJECT_KEY,
        },
      ],
      NOW,
    );
    expect(volunteer.subject).toContain('İpek Şahin');
    expect(volunteer.subject).toContain('VOL-11111111-1111-1111-1111-111111111111');
    expect(volunteer.body).toContain('Because archives matter.');
    expect(volunteer.body).toContain('Legal First Name: İpek');
    expect(volunteer.body).toContain(
      `${SUBMISSION_FILE_LINK_ORIGIN}/api/submission-files/${FILE_ID}`,
    );
    expect(volunteer.body).toContain('Original filename: résumé.pdf');
    expect(volunteer.body).not.toContain(OBJECT_KEY);
    expect(volunteer.body).not.toContain(CLIENT_SECRET);
    expect(volunteer.body).not.toContain(REFRESH_TOKEN);
    expect(volunteer.body).not.toContain(HMAC_SECRET);
    expect(headerValue(volunteer.rfc2822, 'From')).toBe(
      `Golden Archive Foundation <${NOTIFICATION_MAILBOX}>`,
    );
    expect(headerValue(volunteer.rfc2822, 'To')).toBe(NOTIFICATION_MAILBOX);
    expect(headerValue(volunteer.rfc2822, 'Reply-To')).toBe('ipek@example.com');
    expect(decodeRfc2047(headerValue(volunteer.rfc2822, 'Subject'))).toBe(volunteer.subject);
    expect(decodeMimeBody(volunteer.rfc2822)).toBe(volunteer.body);

    const hidden = await buildSubmissionEmail(
      HMAC_SECRET,
      {
        id: 'HIDW-22222222-2222-2222-2222-222222222222',
        form_type: 'hidden_works',
        status: 'received',
        legal_name: 'Ada Lovelace',
        email: 'ada@example.com',
        payload_json: JSON.stringify({
          work_title: 'Kayıp Hikâye',
          entry_type: 'Team',
          competition_category: 'Untranslated Discovery',
          reader_facing_case: 'The full reader-facing case stays in the email.',
          team_members: [{ legal_first_name: 'Bo', legal_last_name: 'Team' }],
        }),
      },
      [],
      NOW,
    );
    expect(hidden.subject).toContain('Kayıp Hikâye');
    expect(hidden.subject).toContain('HIDW-22222222-2222-2222-2222-222222222222');
    expect(hidden.body).toContain('Work title: Kayıp Hikâye');
    expect(hidden.body).toContain('Entry type: Team');
    expect(hidden.body).toContain('Competition category: Untranslated Discovery');
    expect(hidden.body).toContain('The full reader-facing case stays in the email.');
    expect(hidden.body).toContain('Legal First Name: Bo');
    expect(hidden.body).toContain('No files uploaded.');
    expect(decodeMimeBody(hidden.rfc2822)).toContain('Kayıp Hikâye');

    const fallback = await buildSubmissionEmail(
      HMAC_SECRET,
      {
        id: 'HIDW-33333333-3333-3333-3333-333333333333',
        form_type: 'hidden_works',
        status: 'received',
        legal_name: 'Ada Lovelace',
        email: 'ada@example.com',
        payload_json: '{}',
      },
      [] as StoredNotificationFile[],
      NOW,
    );
    expect(fallback.subject).toContain('Ada Lovelace');
    expect(fallback.subject).toContain('HIDW-33333333-3333-3333-3333-333333333333');
  });
});

describe('notification scheduling', () => {
  it('returns volunteer success before Gmail finishes and ignores Gmail failure', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const calls = installFetch(VOLUNTEER_TURNSTILE_ACTION, 'example.com', { fail: true, gate });
    const db = createDb({ files: [], submissions: new Map() });
    const bucket = createBucket();
    const env = createEnv(db, bucket);
    const { ctx, tasks } = createCtx();

    const response = await Promise.race([
      handleVolunteerSubmit(volunteerRequest(), env, ctx),
      new Promise<Response>((_resolve, reject) => {
        setTimeout(() => reject(new Error('handler waited for gmail')), 2000);
      }),
    ]);
    expect(response.status).toBe(201);
    const payload = (await response.json()) as {
      success: boolean;
      duplicate: boolean;
      submission_id: string;
    };
    expect(payload.success).toBe(true);
    expect(payload.duplicate).toBe(false);
    expect(payload.submission_id.startsWith('VOL-')).toBe(true);
    expect(tasks).toHaveLength(1);
    expect(calls.some((call) => call.url === GMAIL_SEND_URL)).toBe(false);

    release();
    await Promise.all(tasks);
    const send = calls.find((call) => call.url === GMAIL_SEND_URL);
    expect(send?.authorization).toBe('Bearer ya29.test-access-token');
    const rfc = decodeBase64Url((JSON.parse(send?.body ?? '{}') as { raw: string }).raw);
    const text = decodeMimeBody(rfc);
    expect(headerValue(rfc, 'Reply-To')).toBe('ada@example.com');
    expect(headerValue(rfc, 'From')).toContain(NOTIFICATION_MAILBOX);
    expect(headerValue(rfc, 'To')).toBe(NOTIFICATION_MAILBOX);
    expect(decodeRfc2047(headerValue(rfc, 'Subject'))).toContain('Ada Lovelace');
    expect(decodeRfc2047(headerValue(rfc, 'Subject'))).toContain(payload.submission_id);
    expect(text).toContain('Because archives matter.');
    expect(text).toContain(`${SUBMISSION_FILE_LINK_ORIGIN}/api/submission-files/`);
    expect(text).not.toContain(CLIENT_SECRET);
    expect(text).not.toContain(REFRESH_TOKEN);
    expect(text).not.toContain(HMAC_SECRET);
    expect(text).not.toContain(`volunteer/${payload.submission_id}/`);
  });

  it('does not schedule a notification when volunteer file persistence fails', async () => {
    const calls = installFetch(VOLUNTEER_TURNSTILE_ACTION, 'example.com', {
      fail: false,
      gate: Promise.resolve(),
    });
    const env = createEnv(
      createDb({ files: [], submissions: new Map() }),
      createBucket({ failPut: true }),
    );
    const { ctx, tasks } = createCtx();
    const response = await handleVolunteerSubmit(volunteerRequest(), env, ctx);
    expect(response.status).toBe(500);
    const body = (await response.json()) as { error?: string; incident_id?: string };
    expect(body).toEqual({ success: false, error: 'submission_failed' });
    expect(JSON.stringify(body)).not.toContain('incident_id');
    // Internal error report may be scheduled; submission notification must not.
    expect(tasks).toHaveLength(1);
    await Promise.allSettled(tasks);
    const sendBodies = calls
      .filter((call) => call.url === GMAIL_SEND_URL)
      .map((call) => {
        const parsed = JSON.parse(call.body) as { raw?: string };
        const raw = parsed.raw ?? '';
        const padded =
          raw.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (raw.length % 4)) % 4);
        const binary = atob(padded);
        return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
      });
    expect(sendBodies).toHaveLength(1);
    expect(decodeRfc2047(headerValue(sendBodies[0]!, 'Subject'))).toContain('[GAF ERROR]');
    expect(headerValue(sendBodies[0]!, 'Reply-To')).toBe('');
    expect(decodeMimeBody(sendBodies[0]!)).not.toContain('ada@example.com');
  });

  it('does not schedule a notification when hidden works file persistence fails', async () => {
    const calls = installFetch(HIDDEN_WORKS_TURNSTILE_ACTION, 'example.com', {
      fail: false,
      gate: Promise.resolve(),
    });
    const bucket = createBucket({ failPut: true });
    const env = createEnv(createDb({ files: [], submissions: new Map() }), bucket);
    const { ctx, tasks } = createCtx();
    const response = await handleHiddenWorksSubmit(
      hiddenWorksRequest('idem-hidden-fail', true),
      env,
      { now: NOW },
      ctx,
    );
    expect(response.status).toBe(500);
    expect(bucket.putCount).toBe(1);
    const body = (await response.json()) as { success?: boolean; error?: string };
    expect(body).toEqual({ success: false, error: 'submission_failed' });
    expect(JSON.stringify(body)).not.toContain('incident_id');
    expect(tasks).toHaveLength(1);
    await Promise.allSettled(tasks);
    const sendBodies = calls
      .filter((call) => call.url === GMAIL_SEND_URL)
      .map((call) => {
        const parsed = JSON.parse(call.body) as { raw?: string };
        const raw = parsed.raw ?? '';
        const padded =
          raw.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (raw.length % 4)) % 4);
        const binary = atob(padded);
        return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
      });
    expect(sendBodies).toHaveLength(1);
    expect(decodeRfc2047(headerValue(sendBodies[0]!, 'Subject'))).toContain(
      '[GAF ERROR] Hidden Works — file_persist',
    );
    expect(headerValue(sendBodies[0]!, 'Reply-To')).toBe('');
    expect(decodeMimeBody(sendBodies[0]!)).not.toContain('Example Work');
  });

  it('does not schedule a second notification for an idempotent replay', async () => {
    const volunteerCalls = installFetch(VOLUNTEER_TURNSTILE_ACTION, 'example.com', {
      fail: false,
      gate: Promise.resolve(),
    });
    const volunteerEnv = createEnv(
      createDb({ idempotencyId: 'VOL-existing', files: [], submissions: new Map() }),
      createBucket(),
    );
    const volunteerCtx = createCtx();
    const volunteerResponse = await handleVolunteerSubmit(
      volunteerRequest(),
      volunteerEnv,
      volunteerCtx.ctx,
    );
    expect(volunteerResponse.status).toBe(200);
    const volunteerBody = (await volunteerResponse.json()) as {
      duplicate: boolean;
      submission_id: string;
    };
    expect(volunteerBody).toEqual({
      success: true,
      duplicate: true,
      submission_id: 'VOL-existing',
    });
    expect(volunteerCtx.tasks).toHaveLength(0);
    expect(volunteerCalls.some((call) => call.url.includes('googleapis.com'))).toBe(false);

    const hiddenCalls = installFetch(HIDDEN_WORKS_TURNSTILE_ACTION, 'example.com', {
      fail: false,
      gate: Promise.resolve(),
    });
    const hiddenEnv = createEnv(
      createDb({ idempotencyId: 'HIDW-existing', files: [], submissions: new Map() }),
      createBucket(),
    );
    const hiddenCtx = createCtx();
    const hiddenResponse = await handleHiddenWorksSubmit(
      hiddenWorksRequest('idem-replay', false),
      hiddenEnv,
      { now: NOW },
      hiddenCtx.ctx,
    );
    expect(hiddenResponse.status).toBe(200);
    expect(await hiddenResponse.json()).toEqual({
      success: true,
      duplicate: true,
      submission_id: 'HIDW-existing',
    });
    expect(hiddenCtx.tasks).toHaveLength(0);
    expect(hiddenCalls.some((call) => call.url.includes('googleapis.com'))).toBe(false);
  });
});
