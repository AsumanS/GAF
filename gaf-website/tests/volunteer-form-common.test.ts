import { describe, expect, it } from 'vitest';
import {
  MAX_SINGLE_FILE_BYTES,
  MAX_STRING_CHARS,
  TextTooLargeError,
  ValidationError,
  VOLUNTEER_TURNSTILE_ACTION,
  buildPayloadJson,
  buildVolunteerObjectKey,
  collectTextFields,
  existingVolunteerSubmissionResponse,
  isTurnstileAccepted,
  isValidEmail,
  newVolunteerSubmissionResponse,
  sanitizeOriginalFilename,
  validateUploadedFile,
  validateVolunteerFiles,
  validateVolunteerTextFields,
  RESUME_SPEC,
  WORK_SAMPLE_SPEC,
} from '../worker/forms/common';

function baseFields(overrides: Record<string, string | string[]> = {}): Record<
  string,
  string | string[]
> {
  return {
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
    preferred_availability: ['Weekdays'],
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
    ...overrides,
  };
}

describe('volunteer text validation', () => {
  it('rejects a missing required field', () => {
    const fields = baseFields({ first_name: '' });
    expect(() => validateVolunteerTextFields(fields, 'idem-1')).toThrow(ValidationError);
  });

  it('rejects age_18_or_older = No', () => {
    const fields = baseFields({ age_18_or_older: 'No' });
    expect(() => validateVolunteerTextFields(fields, 'idem-1')).toThrow(ValidationError);
  });

  it('rejects a missing declaration', () => {
    const fields = baseFields({ declare_accuracy: 'no' });
    expect(() => validateVolunteerTextFields(fields, 'idem-1')).toThrow(ValidationError);
  });

  it('rejects missing preferred availability', () => {
    const fields = baseFields();
    delete fields.preferred_availability;
    expect(() => validateVolunteerTextFields(fields, 'idem-1')).toThrow(ValidationError);
  });

  it('rejects a bad email', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    const fields = baseFields({ email: 'not-an-email' });
    expect(() => validateVolunteerTextFields(fields, 'idem-1')).toThrow(ValidationError);
  });

  it('rejects oversized individual text values', () => {
    const fd = new FormData();
    fd.set('why_volunteer', 'x'.repeat(MAX_STRING_CHARS + 1));
    expect(() => collectTextFields(fd)).toThrow(ValidationError);
  });

  it('rejects total non-file text over 1 MiB', () => {
    const fd = new FormData();
    const chunk = 'a'.repeat(90_000);
    for (let i = 0; i < 12; i += 1) {
      fd.set(`field_${i}`, chunk);
    }
    expect(() => collectTextFields(fd)).toThrow(TextTooLargeError);
  });

  it('accepts a complete valid volunteer payload', () => {
    const result = validateVolunteerTextFields(baseFields(), 'idem-42');
    expect(result.legalName).toBe('Ada Lovelace');
    expect(result.email).toBe('ada@example.com');
    expect(result.idempotencyKey).toBe('idem-42');
    expect(Array.isArray(result.fields.preferred_availability)).toBe(true);
  });
});

describe('volunteer file validation', () => {
  it('rejects a bad resume file type', () => {
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    expect(() => validateUploadedFile(file, RESUME_SPEC)).toThrow(ValidationError);
  });

  it('rejects an oversized resume', () => {
    const file = new File([new Uint8Array(MAX_SINGLE_FILE_BYTES + 1)], 'resume.pdf', {
      type: 'application/pdf',
    });
    expect(() => validateUploadedFile(file, RESUME_SPEC)).toThrow(ValidationError);
  });

  it('accepts a valid optional work sample image', () => {
    const file = new File([new Uint8Array(32)], 'sample.png', { type: 'image/png' });
    const validated = validateUploadedFile(file, WORK_SAMPLE_SPEC);
    expect(validated.validatedExtension).toBe('png');
  });

  it('rejects empty resume', () => {
    const fd = new FormData();
    fd.set('resume', new File([], 'resume.pdf', { type: 'application/pdf' }));
    expect(() => validateVolunteerFiles(fd)).toThrow(ValidationError);
  });
});

describe('turnstile acceptance', () => {
  it('rejects action mismatch', () => {
    expect(
      isTurnstileAccepted(
        { success: true, action: 'other_action', hostname: 'example.com' },
        VOLUNTEER_TURNSTILE_ACTION,
        'example.com',
      ),
    ).toBe(false);
  });

  it('rejects hostname mismatch', () => {
    expect(
      isTurnstileAccepted(
        { success: true, action: VOLUNTEER_TURNSTILE_ACTION, hostname: 'evil.example' },
        VOLUNTEER_TURNSTILE_ACTION,
        'example.com',
      ),
    ).toBe(false);
  });

  it('accepts matching success, action, and hostname', () => {
    expect(
      isTurnstileAccepted(
        { success: true, action: VOLUNTEER_TURNSTILE_ACTION, hostname: 'example.com' },
        VOLUNTEER_TURNSTILE_ACTION,
        'example.com',
      ),
    ).toBe(true);
  });
});

describe('payload and object keys', () => {
  it('excludes Turnstile token and idempotency key from payload_json', () => {
    const fd = new FormData();
    fd.set('first_name', 'Ada');
    fd.set('cf-turnstile-response', 'secret-token-value');
    fd.set('submission_idempotency_key', 'idem-1');
    const { fields } = collectTextFields(fd);
    const payload = buildPayloadJson(fields);
    expect(payload).not.toContain('secret-token-value');
    expect(payload).not.toContain('cf-turnstile-response');
    expect(payload).not.toContain('idem-1');
    expect(payload).not.toContain('submission_idempotency_key');
    expect(JSON.parse(payload)).toEqual({ first_name: 'Ada' });
  });

  it('does not include file contents in payload_json', () => {
    const fd = new FormData();
    fd.set('first_name', 'Ada');
    fd.set(
      'resume',
      new File([new Uint8Array([1, 2, 3, 4])], 'resume.pdf', { type: 'application/pdf' }),
    );
    const { fields } = collectTextFields(fd);
    const payload = buildPayloadJson(fields);
    expect(payload).toBe(JSON.stringify({ first_name: 'Ada' }));
    expect(payload).not.toContain('resume');
  });

  it('never puts the original filename into the R2 object key', () => {
    const original = 'My Personal Resume (final).PDF';
    const key = buildVolunteerObjectKey('VOL-abc', '11111111-2222-3333-4444-555555555555', 'pdf');
    expect(key).toBe('volunteer/VOL-abc/11111111-2222-3333-4444-555555555555.pdf');
    expect(key.includes(original)).toBe(false);
    expect(key.toLowerCase().includes('resume')).toBe(false);
    expect(sanitizeOriginalFilename(`../../${original}`)).toBe('My Personal Resume (final).PDF');
  });
});

describe('idempotency behavior', () => {
  it('returns HTTP 200 duplicate payload for an existing volunteer submission', () => {
    const existingId = 'VOL-existing';
    const replay = existingVolunteerSubmissionResponse(existingId);
    const created = newVolunteerSubmissionResponse('VOL-new');
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual({
      success: true,
      submission_id: existingId,
      duplicate: true,
    });
    expect(created.status).toBe(201);
    expect(created.body.duplicate).toBe(false);
    expect(replay.body.submission_id).not.toBe(created.body.submission_id);
  });
});
