import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../worker/env';
import {
  buildInternalErrorConsolePayload,
  buildInternalErrorEmailBody,
  buildInternalErrorSubject,
  internalFailureResponse,
  newIncidentId,
  redactSecrets,
  scheduleInternalErrorReport,
} from '../worker/errorNotification';
import {
  HIDDEN_WORKS_DEADLINE_UTC,
  HIDDEN_WORKS_TURNSTILE_ACTION,
  handleHiddenWorksSubmit,
} from '../worker/forms/hiddenWorks';
import { VOLUNTEER_TURNSTILE_ACTION } from '../worker/forms/common';
import { handleVolunteerSubmit } from '../worker/forms/volunteer';
import worker from '../worker/index';
import { createRequestTimer } from '../worker/requestTiming';
import {
  GMAIL_SEND_URL,
  GMAIL_TOKEN_URL,
} from '../worker/submissionEmail';
import * as hiddenWorksModule from '../worker/forms/hiddenWorks';

type JsonBody = {
  success?: boolean;
  error?: string;
  field?: string;
  message?: string;
};

const CLIENT_ID = 'test-gmail-client-id';
const CLIENT_SECRET = 'test-gmail-client-secret-value';
const REFRESH_TOKEN = 'test-gmail-refresh-token-value';
const HMAC_SECRET = 'test-hmac-secret-value';
const TURNSTILE_SECRET = 'turnstile-test-secret';
const NOW = new Date('2026-09-26T12:00:00.000Z');

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function words(count: number): string {
  return Array.from({ length: count }, (_, index) => `word${index}`).join(' ');
}

function decodeMimeBody(rfc2822: string): string {
  const encoded = (rfc2822.split('\r\n\r\n')[1] ?? '').replace(/\r\n/g, '');
  const binary = atob(encoded);
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
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

type FileRow = {
  id: string;
  submission_id?: string;
  field_name: string;
  original_filename: string;
  object_key: string;
  content_type: string;
  size_bytes: number;
};

type DbOptions = {
  idempotencyId?: string | null;
  failBatch?: boolean;
  failEligible?: boolean;
  failEntryLimit?: boolean;
  failIdempotency?: boolean;
  entryLimitRows?: Array<{ email: string | null; payload_json: string | null }>;
  files?: FileRow[];
};

function createDb(options: DbOptions = {}) {
  const state = {
    files: options.files ?? [],
    submissions: new Map<string, unknown>(),
  };

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
          if (options.failIdempotency) throw new Error('idempotency lookup failed');
          return (options.idempotencyId ? { id: options.idempotencyId } : null) as T | null;
        }
        if (sql.includes('COUNT(DISTINCT')) {
          if (options.failEligible) throw new Error('eligible cap query failed');
          return { cnt: 0 } as T;
        }
        return null;
      },
      async all<T>() {
        if (sql.includes('email') && sql.includes('payload_json') && sql.includes('form_type')) {
          if (options.failEntryLimit) throw new Error('entry limit query failed');
          return { results: (options.entryLimitRows ?? []) as T[] };
        }
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
      if (options.failBatch) {
        throw new Error(`d1 batch failed secret=${CLIENT_SECRET}`);
      }
      for (const statement of statements) {
        if (!statement.sql.includes('INSERT INTO submissions')) continue;
        state.submissions.set(String(statement.args[0]), statement.args);
      }
      return [];
    },
  };
}

function createBucket(options: { failPut?: boolean } = {}) {
  const objects = new Map<string, Uint8Array>();
  return {
    objects,
    async put(key: string, value: ReadableStream | ArrayBuffer | Uint8Array | Blob) {
      if (options.failPut) throw new Error(`r2 put failed secret=${HMAC_SECRET}`);
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
    async get() {
      return null;
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
        throw new Error('assets unused');
      },
    } as unknown as Env['ASSETS'],
    SUBMISSIONS_DB: db as unknown as Env['SUBMISSIONS_DB'],
    SUBMISSION_FILES: bucket as unknown as Env['SUBMISSION_FILES'],
    TURNSTILE_SECRET_KEY: TURNSTILE_SECRET,
    GMAIL_CLIENT_ID: CLIENT_ID,
    GMAIL_CLIENT_SECRET: CLIENT_SECRET,
    GMAIL_REFRESH_TOKEN: REFRESH_TOKEN,
    SUBMISSION_FILE_LINK_SECRET: HMAC_SECRET,
  };
}

type FetchCall = { url: string; body: string };

function installFetch(action: string, options: { failGmail?: boolean } = {}) {
  const calls: FetchCall[] = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const body = await request.text();
    calls.push({ url: request.url, body });
    if (request.url.includes('challenges.cloudflare.com')) {
      return Response.json({ success: true, action, hostname: 'example.com' });
    }
    if (request.url === GMAIL_TOKEN_URL) {
      if (options.failGmail) return new Response('auth failed', { status: 500 });
      return Response.json({ access_token: 'ya29.test-access-token' });
    }
    if (request.url === GMAIL_SEND_URL) {
      if (options.failGmail) return new Response('send failed', { status: 500 });
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
    async flush() {
      await Promise.allSettled(tasks.splice(0, tasks.length));
    },
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

function hiddenWorksRequest(
  overrides: Record<string, string> = {},
  withFile = true,
): Request {
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
    submission_idempotency_key: 'idem-hidden-works',
    'cf-turnstile-response': 'token',
    ...overrides,
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
    headers: { Origin: 'https://example.com', 'CF-Ray': 'test-cf-ray' },
    body: form,
  });
}

function volunteerRequest(overrides: Record<string, string> = {}): Request {
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
    ...overrides,
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

function errorConsoleLogs(spy: ReturnType<typeof vi.spyOn>): Array<Record<string, unknown>> {
  return spy.mock.calls
    .map((call) => {
      const first = call[0];
      if (typeof first !== 'string') return null;
      try {
        return JSON.parse(first) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter((item): item is Record<string, unknown> => Boolean(item));
}

function gmailSendBodies(calls: FetchCall[]): string[] {
  return calls
    .filter((call) => call.url === GMAIL_SEND_URL)
    .map((call) => {
      const parsed = JSON.parse(call.body) as { raw?: string };
      const raw = parsed.raw ?? '';
      const padded = raw.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (raw.length % 4)) % 4);
      const binary = atob(padded);
      return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
    });
}

describe('internal error reporting helpers', () => {
  it('redacts configured secrets and bearer patterns', () => {
    const text = `secret=${CLIENT_SECRET} Bearer ya29.abc refresh_token=${REFRESH_TOKEN}`;
    const redacted = redactSecrets(text, [
      CLIENT_ID,
      CLIENT_SECRET,
      REFRESH_TOKEN,
      HMAC_SECRET,
      TURNSTILE_SECRET,
    ]);
    expect(redacted).not.toContain(CLIENT_SECRET);
    expect(redacted).not.toContain(REFRESH_TOKEN);
    expect(redacted).toContain('[REDACTED]');
    expect(redacted).toContain('Bearer [REDACTED]');
  });

  it('redacts applicant-looking email addresses from diagnostic text', () => {
    const error = new Error('lookup failed for ada@example.com');
    error.stack = 'Error: lookup failed for ada@example.com\n    at persist';
    const cause = new Error('downstream for bo.team@example.org');
    cause.stack = 'Error: downstream for bo.team@example.org\n    at r2';
    const wrapped = new Error('file_persist_failed', { cause });
    const secrets = [CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, HMAC_SECRET, TURNSTILE_SECRET];
    const body = buildInternalErrorEmailBody({
      incidentId: 'ERR-email',
      formType: 'hidden_works',
      stage: 'file_persist',
      request: new Request('https://example.com/api/forms/hidden-works', { method: 'POST' }),
      error: wrapped,
      secrets,
    });
    const consolePayload = buildInternalErrorConsolePayload({
      incidentId: 'ERR-email',
      formType: 'hidden_works',
      stage: 'file_persist',
      request: new Request('https://example.com/api/forms/hidden-works', { method: 'POST' }),
      error,
      secrets,
    });
    expect(body).toContain('[REDACTED_EMAIL]');
    expect(body).not.toContain('ada@example.com');
    expect(body).not.toContain('bo.team@example.org');
    expect(JSON.stringify(consolePayload)).toContain('[REDACTED_EMAIL]');
    expect(JSON.stringify(consolePayload)).not.toContain('ada@example.com');
    expect(redactSecrets('contact me at ada@example.com please', [])).toBe(
      'contact me at [REDACTED_EMAIL] please',
    );
  });

  it('never throws when incident ID generation fails and preserves the 500 contract', async () => {
    installFetch(HIDDEN_WORKS_TURNSTILE_ACTION, { failGmail: true });
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      throw new Error('uuid unavailable');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { ctx, flush } = createCtx();
    try {
      const env = createEnv(createDb(), createBucket());
      const request = new Request('https://example.com/api/forms/hidden-works', { method: 'POST' });

      expect(() => newIncidentId()).not.toThrow();
      expect(newIncidentId().startsWith('ERR-fallback-')).toBe(true);

      expect(() =>
        scheduleInternalErrorReport(ctx, env, {
          formType: 'hidden_works',
          stage: 'submission_persist',
          request,
          error: new Error('persist failed'),
        }),
      ).not.toThrow();

      const response = internalFailureResponse(
        ctx,
        env,
        request,
        'hidden_works',
        'submission_persist',
        new Error('persist failed'),
      );
      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        success: false,
        error: 'submission_failed',
      });
      expect(errorConsoleLogs(consoleSpy).length).toBeGreaterThan(0);
      await flush();
    } finally {
      uuidSpy.mockRestore();
    }
  });

  it('builds a diagnostic email without applicant payload or secrets', () => {
    const error = new Error(`boom ${CLIENT_SECRET}`);
    error.stack = `Error: boom ${CLIENT_SECRET}\n    at test`;
    const body = buildInternalErrorEmailBody({
      incidentId: 'ERR-test',
      formType: 'hidden_works',
      stage: 'submission_persist',
      request: new Request('https://example.com/api/forms/hidden-works', {
        method: 'POST',
        headers: { 'CF-Ray': 'abc' },
      }),
      error,
      submissionId: 'HIDW-1',
      secrets: [CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, HMAC_SECRET, TURNSTILE_SECRET],
    });
    expect(body).toContain('Incident ID: ERR-test');
    expect(body).toContain('Form type: hidden_works');
    expect(body).toContain('Stage: submission_persist');
    expect(body).toContain('Exception name: Error');
    expect(body).toContain('Exception message:');
    expect(body).toContain('Exception stack:');
    expect(body).toContain('Submission ID: HIDW-1');
    expect(body).not.toContain(CLIENT_SECRET);
    expect(body).not.toContain(REFRESH_TOKEN);
    expect(body).not.toContain(TURNSTILE_SECRET);
    expect(body).not.toContain(HMAC_SECRET);
    expect(body).not.toContain('ada@example.com');
    expect(body).not.toContain('payload_json');
    expect(buildInternalErrorSubject('hidden_works', 'file_persist', 'ERR-1')).toBe(
      '[GAF ERROR] Hidden Works — file_persist — ERR-1',
    );
  });

  it('does not recurse when error-email Gmail delivery fails', async () => {
    const calls = installFetch(HIDDEN_WORKS_TURNSTILE_ACTION, { failGmail: true });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { ctx, flush } = createCtx();
    const env = createEnv(createDb(), createBucket());
    const incidentId = scheduleInternalErrorReport(ctx, env, {
      formType: 'hidden_works',
      stage: 'submission_persist',
      request: new Request('https://example.com/api/forms/hidden-works', { method: 'POST' }),
      error: new Error('persist failed'),
    });
    await flush();
    expect(incidentId.startsWith('ERR-')).toBe(true);
    expect(calls.filter((c) => c.url === GMAIL_TOKEN_URL)).toHaveLength(1);
    expect(calls.filter((c) => c.url === GMAIL_SEND_URL)).toHaveLength(0);
    const logs = errorConsoleLogs(consoleSpy);
    expect(logs.some((log) => log.marker === 'internal_error')).toBe(true);
    expect(logs.some((log) => log.marker === 'internal_error_email_failed')).toBe(true);
    expect(logs.filter((log) => log.marker === 'internal_error')).toHaveLength(1);
  });
});

describe('Hidden Works unexpected infrastructure failures', () => {
  it('schedules one error report on D1 insert failure without exposing incident_id', async () => {
    const calls = installFetch(HIDDEN_WORKS_TURNSTILE_ACTION);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { ctx, flush } = createCtx();
    const env = createEnv(createDb({ failBatch: true }), createBucket());
    const response = await handleHiddenWorksSubmit(
      hiddenWorksRequest(),
      env,
      { now: NOW },
      ctx,
    );
    expect(response.status).toBe(500);
    const body = (await response.json()) as JsonBody;
    expect(body).toEqual({ success: false, error: 'submission_failed' });
    expect(JSON.stringify(body)).not.toContain('incident_id');
    expect(JSON.stringify(body)).not.toContain(CLIENT_SECRET);
    expect(JSON.stringify(body)).not.toContain('d1 batch failed');
    await flush();
    const logs = errorConsoleLogs(consoleSpy).filter((log) => log.marker === 'internal_error');
    expect(logs).toHaveLength(1);
    expect(logs[0]?.stage).toBe('submission_persist');
    expect(logs[0]?.form_type).toBe('hidden_works');
    expect(String(logs[0]?.incident_id ?? '')).toMatch(/^ERR-/);
    const rfcBodies = gmailSendBodies(calls);
    expect(rfcBodies).toHaveLength(1);
    const rfc = rfcBodies[0]!;
    const subject = decodeRfc2047(headerValue(rfc, 'Subject'));
    const mime = decodeMimeBody(rfc);
    expect(subject).toContain('[GAF ERROR] Hidden Works — submission_persist —');
    expect(mime).toContain(String(logs[0]?.incident_id));
    expect(mime).toContain('Stage: submission_persist');
    expect(mime).toContain('Exception name: Error');
    expect(mime).toContain('Exception message:');
    expect(mime).toContain('Exception stack:');
    expect(mime).not.toContain(CLIENT_SECRET);
    expect(mime).not.toContain(REFRESH_TOKEN);
    expect(mime).not.toContain(TURNSTILE_SECRET);
    expect(mime).not.toContain(HMAC_SECRET);
    expect(mime).not.toContain('ada@example.com');
    expect(mime).not.toContain('Example Work');
  });

  it('schedules one error report on R2 failure and preserves sanitized cause', async () => {
    const calls = installFetch(HIDDEN_WORKS_TURNSTILE_ACTION);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { ctx, flush } = createCtx();
    const env = createEnv(createDb(), createBucket({ failPut: true }));
    const response = await handleHiddenWorksSubmit(
      hiddenWorksRequest(),
      env,
      { now: NOW },
      ctx,
    );
    expect(response.status).toBe(500);
    const body = (await response.json()) as JsonBody;
    expect(body).toEqual({ success: false, error: 'submission_failed' });
    expect(JSON.stringify(body)).not.toContain('incident_id');
    expect(JSON.stringify(body)).not.toContain('r2 put failed');
    await flush();
    const logs = errorConsoleLogs(consoleSpy).filter((log) => log.marker === 'internal_error');
    expect(logs).toHaveLength(1);
    expect(logs[0]?.stage).toBe('file_persist');
    expect(logs[0]?.exception_message).toBe('file_persist_failed');
    expect(String(logs[0]?.cause_message ?? '')).toContain('r2 put failed');
    expect(JSON.stringify(logs[0])).not.toContain(HMAC_SECRET);
    expect(String(logs[0]?.incident_id ?? '')).toMatch(/^ERR-/);
    const rfcBodies = gmailSendBodies(calls);
    expect(rfcBodies).toHaveLength(1);
    const mime = decodeMimeBody(rfcBodies[0]!);
    expect(mime).toContain('Exception message: file_persist_failed');
    expect(mime).toContain('Exception cause message:');
    expect(mime).toContain('r2 put failed');
    expect(mime).toContain('Exception cause stack:');
    expect(mime).not.toContain(HMAC_SECRET);
  });

  it('does not schedule error reports for validation failures', async () => {
    const calls = installFetch(HIDDEN_WORKS_TURNSTILE_ACTION);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { ctx, flush } = createCtx();
    const env = createEnv(createDb(), createBucket());
    const response = await handleHiddenWorksSubmit(
      hiddenWorksRequest({ work_title: '' }),
      env,
      { now: NOW },
      ctx,
    );
    expect(response.status).toBe(400);
    await flush();
    expect(errorConsoleLogs(consoleSpy).filter((log) => log.marker === 'internal_error')).toHaveLength(
      0,
    );
    expect(gmailSendBodies(calls)).toHaveLength(0);
  });

  it('does not schedule error reports for contest_closed', async () => {
    const calls = installFetch(HIDDEN_WORKS_TURNSTILE_ACTION);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { ctx, flush } = createCtx();
    const env = createEnv(createDb(), createBucket());
    const response = await handleHiddenWorksSubmit(
      hiddenWorksRequest(),
      env,
      { now: new Date(HIDDEN_WORKS_DEADLINE_UTC) },
      ctx,
    );
    expect(response.status).toBe(409);
    const body = (await response.json()) as JsonBody;
    expect(body.error).toBe('contest_closed');
    await flush();
    expect(errorConsoleLogs(consoleSpy).filter((log) => log.marker === 'internal_error')).toHaveLength(
      0,
    );
    expect(gmailSendBodies(calls)).toHaveLength(0);
  });

  it('does not schedule error reports for entry_limit_reached', async () => {
    const calls = installFetch(HIDDEN_WORKS_TURNSTILE_ACTION);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { ctx, flush } = createCtx();
    const env = createEnv(
      createDb({
        entryLimitRows: [
          {
            email: 'ada@example.com',
            payload_json: JSON.stringify({ participant_emails: ['ada@example.com'] }),
          },
          {
            email: 'ada@example.com',
            payload_json: JSON.stringify({ participant_emails: ['ada@example.com'] }),
          },
        ],
      }),
      createBucket(),
    );
    const response = await handleHiddenWorksSubmit(
      hiddenWorksRequest(),
      env,
      { now: NOW },
      ctx,
    );
    expect(response.status).toBe(409);
    const body = (await response.json()) as JsonBody;
    expect(body.error).toBe('entry_limit_reached');
    await flush();
    expect(errorConsoleLogs(consoleSpy).filter((log) => log.marker === 'internal_error')).toHaveLength(
      0,
    );
    expect(gmailSendBodies(calls)).toHaveLength(0);
  });

  it('keeps the original HTTP status when error reporting itself fails', async () => {
    const calls = installFetch(HIDDEN_WORKS_TURNSTILE_ACTION, { failGmail: true });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { ctx, flush } = createCtx();
    const env = createEnv(createDb({ failBatch: true }), createBucket());
    const response = await handleHiddenWorksSubmit(
      hiddenWorksRequest(),
      env,
      { now: NOW },
      ctx,
    );
    expect(response.status).toBe(500);
    const body = (await response.json()) as JsonBody;
    expect(body).toEqual({ success: false, error: 'submission_failed' });
    expect(JSON.stringify(body)).not.toContain('incident_id');
    await flush();
    expect(errorConsoleLogs(consoleSpy).some((log) => log.marker === 'internal_error_email_failed')).toBe(
      true,
    );
    expect(gmailSendBodies(calls)).toHaveLength(0);
  });
});

describe('Volunteer unexpected infrastructure failures', () => {
  it('schedules one report on unexpected persistence failure', async () => {
    const calls = installFetch(VOLUNTEER_TURNSTILE_ACTION);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { ctx, flush } = createCtx();
    const env = createEnv(createDb({ failBatch: true }), createBucket());
    const response = await handleVolunteerSubmit(volunteerRequest(), env, ctx);
    expect(response.status).toBe(500);
    const body = (await response.json()) as JsonBody;
    expect(body).toEqual({ success: false, error: 'submission_failed' });
    expect(JSON.stringify(body)).not.toContain('incident_id');
    await flush();
    const logs = errorConsoleLogs(consoleSpy).filter((log) => log.marker === 'internal_error');
    expect(logs).toHaveLength(1);
    expect(logs[0]?.stage).toBe('submission_persist');
    expect(logs[0]?.form_type).toBe('volunteer');
    expect(String(logs[0]?.incident_id ?? '')).toMatch(/^ERR-/);
    expect(gmailSendBodies(calls)).toHaveLength(1);
  });

  it('does not schedule reports for validation failures', async () => {
    const calls = installFetch(VOLUNTEER_TURNSTILE_ACTION);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { ctx, flush } = createCtx();
    const env = createEnv(createDb(), createBucket());
    const response = await handleVolunteerSubmit(
      volunteerRequest({ first_name: '' }),
      env,
      ctx,
    );
    expect(response.status).toBe(400);
    await flush();
    expect(errorConsoleLogs(consoleSpy).filter((log) => log.marker === 'internal_error')).toHaveLength(
      0,
    );
    expect(gmailSendBodies(calls)).toHaveLength(0);
  });
});

describe('slow request timing', () => {
  it('emits no warning for a fast stage', () => {
    const warnings: string[] = [];
    let fakeNow = 1_000;
    const timer = createRequestTimer(
      'hidden_works',
      new Request('https://example.com/api/forms/hidden-works', {
        headers: { 'CF-Ray': 'ray-fast' },
      }),
      {
        now: () => fakeNow,
        warn: (line) => warnings.push(line),
      },
    );
    const started = fakeNow;
    fakeNow += 4_999;
    timer.recordStage('validation', started);
    timer.finishTotal();
    expect(warnings).toHaveLength(0);
  });

  it('emits one warning when a stage exceeds 5 seconds', () => {
    const warnings: string[] = [];
    let fakeNow = 0;
    const timer = createRequestTimer(
      'hidden_works',
      new Request('https://example.com/api/forms/hidden-works', {
        headers: { 'CF-Ray': 'ray-slow' },
      }),
      {
        now: () => fakeNow,
        warn: (line) => warnings.push(line),
      },
    );
    const started = fakeNow;
    fakeNow = 5_001;
    timer.setSubmissionId('HIDW-test');
    timer.recordStage('file_persist', started);
    expect(warnings).toHaveLength(1);
    const payload = JSON.parse(warnings[0]!) as Record<string, unknown>;
    expect(payload).toEqual({
      marker: 'slow_request',
      form_type: 'hidden_works',
      stage: 'file_persist',
      duration_ms: 5_001,
      submission_id: 'HIDW-test',
      cf_ray: 'ray-slow',
    });
    expect(JSON.stringify(payload)).not.toContain('ada@example.com');
    expect(JSON.stringify(payload)).not.toContain(CLIENT_SECRET);
    expect(JSON.stringify(payload)).not.toContain(TURNSTILE_SECRET);
  });

  it('emits a warning when total request exceeds 15 seconds', () => {
    const warnings: string[] = [];
    let fakeNow = 10;
    const timer = createRequestTimer(
      'volunteer',
      new Request('https://example.com/api/forms/volunteer'),
      {
        now: () => fakeNow,
        warn: (line) => warnings.push(line),
      },
    );
    fakeNow = 10 + 15_001;
    timer.finishTotal();
    expect(warnings).toHaveLength(1);
    const payload = JSON.parse(warnings[0]!) as Record<string, unknown>;
    expect(payload.marker).toBe('slow_request');
    expect(payload.stage).toBe('total_request');
    expect(payload.duration_ms).toBe(15_001);
    expect(payload.form_type).toBe('volunteer');
  });

  it('does not count post-response waitUntil Gmail work in total_request', async () => {
    const warnings: string[] = [];
    let fakeNow = 0;
    const timer = createRequestTimer(
      'hidden_works',
      new Request('https://example.com/api/forms/hidden-works'),
      {
        now: () => fakeNow,
        warn: (line) => warnings.push(line),
      },
    );

    // Simulate request path completing in 100ms, then schedule background work.
    fakeNow = 100;
    const totalBeforeBackground = timer.finishTotal();
    expect(totalBeforeBackground).toBe(100);
    expect(warnings).toHaveLength(0);

    // Background Gmail would run after the response is ready; advancing the clock
    // after finishTotal must not create a late total_request warning.
    fakeNow = 20_000;
    expect(warnings).toHaveLength(0);
  });

  it('warns when formdata_parse exceeds 5 seconds and includes that stage in total', () => {
    const warnings: string[] = [];
    let fakeNow = 0;
    const timer = createRequestTimer(
      'hidden_works',
      new Request('https://example.com/api/forms/hidden-works', {
        headers: { 'CF-Ray': 'ray-formdata' },
      }),
      {
        now: () => fakeNow,
        warn: (line) => warnings.push(line),
      },
    );
    const parseStarted = fakeNow;
    fakeNow = 6_000;
    timer.recordStage('formdata_parse', parseStarted);
    fakeNow = 16_000;
    timer.finishTotal();
    expect(warnings).toHaveLength(2);
    const stages = warnings.map((line) => (JSON.parse(line) as { stage: string }).stage);
    expect(stages).toEqual(['formdata_parse', 'total_request']);
    expect(JSON.parse(warnings[0]!).duration_ms).toBe(6_000);
    expect(JSON.parse(warnings[1]!).duration_ms).toBe(16_000);
  });

  it('does not warn for a fast formdata_parse', () => {
    const warnings: string[] = [];
    let fakeNow = 0;
    const timer = createRequestTimer(
      'volunteer',
      new Request('https://example.com/api/forms/volunteer'),
      {
        now: () => fakeNow,
        warn: (line) => warnings.push(line),
      },
    );
    const started = fakeNow;
    fakeNow = 2_000;
    timer.recordStage('formdata_parse', started);
    timer.finishTotal();
    expect(warnings).toHaveLength(0);
  });
});

describe('file_persist cause preservation', () => {
  it('includes redacted underlying cause in developer diagnostics', () => {
    const root = new Error(`r2 denied ${HMAC_SECRET}`);
    root.stack = `Error: r2 denied ${HMAC_SECRET}\n    at put`;
    const wrapped = new Error('file_persist_failed', { cause: root });
    const body = buildInternalErrorEmailBody({
      incidentId: 'ERR-cause',
      formType: 'hidden_works',
      stage: 'file_persist',
      request: new Request('https://example.com/api/forms/hidden-works', { method: 'POST' }),
      error: wrapped,
      submissionId: 'HIDW-1',
      secrets: [CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, HMAC_SECRET, TURNSTILE_SECRET],
    });
    expect(body).toContain('Exception message: file_persist_failed');
    expect(body).toContain('Exception cause name: Error');
    expect(body).toContain('Exception cause message: r2 denied [REDACTED]');
    expect(body).toContain('Exception cause stack:');
    expect(body).not.toContain(HMAC_SECRET);
  });
});

describe('top-level API async catch', () => {
  it('awaits rejected form handlers and returns the generic 500 contract', async () => {
    const spy = vi
      .spyOn(hiddenWorksModule, 'handleHiddenWorksSubmit')
      .mockRejectedValue(new Error(`async escape ${CLIENT_SECRET}`));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const env = createEnv(createDb(), createBucket());
    const response = await worker.fetch(
      new Request('https://example.com/api/forms/hidden-works', {
        method: 'POST',
        headers: { Origin: 'https://example.com' },
        body: new FormData(),
      }),
      env,
      createCtx().ctx,
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'submission_failed',
    });
    const logs = errorConsoleLogs(consoleSpy).filter((log) => log.marker === 'unhandled_api');
    expect(logs).toHaveLength(1);
    expect(JSON.stringify(logs[0])).not.toContain(CLIENT_SECRET);
    spy.mockRestore();
  });
});
