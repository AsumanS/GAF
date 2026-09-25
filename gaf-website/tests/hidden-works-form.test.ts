import { describe, expect, it } from 'vitest';
import {
  FieldValidationError,
  MAX_STRING_CHARS,
  ValidationError,
  isTurnstileAccepted,
} from '../worker/forms/common';
import {
  HIDDEN_WORKS_AGREEMENT_VERSION,
  HIDDEN_WORKS_AGREEMENTS,
  HIDDEN_WORKS_DEADLINE_UTC,
  HIDDEN_WORKS_ELIGIBLE_CAP,
  HIDDEN_WORKS_MAX_FILE_COUNT,
  HIDDEN_WORKS_MAX_TOTAL_FILE_BYTES,
  HIDDEN_WORKS_RECEIVED_EVENT_SQL,
  HIDDEN_WORKS_TURNSTILE_ACTION,
  buildHiddenWorksObjectKey,
  collectHiddenWorksTextFields,
  existingHiddenWorksSubmissionResponse,
  hasReachedEntryLimit,
  hiddenWorksValidationErrorResponse,
  isEligibleCapReached,
  isHiddenWorksContestClosed,
  newHiddenWorksSubmissionId,
  validateHiddenWorksFiles,
  validateHiddenWorksTextFields,
} from '../worker/forms/hiddenWorks';

function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `word${i}`).join(' ');
}

function agreements(): Record<string, string> {
  return {
    agree_eligibility_accuracy: 'yes',
    agree_rights_materials: 'yes',
    agree_contest_administration: 'yes',
    agree_rules_privacy: 'yes',
  };
}

function expectFieldError(
  fn: () => unknown,
  field: string,
  messageIncludes?: string,
): void {
  try {
    fn();
    expect.fail('expected FieldValidationError');
  } catch (error) {
    expect(error).toBeInstanceOf(FieldValidationError);
    const err = error as FieldValidationError;
    expect(err.field).toBe(field);
    if (messageIncludes) {
      expect(err.publicMessage).toContain(messageIncludes);
    }
  }
}

function baseFields(
  overrides: Record<string, string | string[]> = {},
): Record<string, string | string[]> {
  return {
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
    submission_date: '2000-01-01',
    ...agreements(),
    ...overrides,
  };
}

const now = new Date('2026-09-25T12:00:00Z');

describe('hidden works ids and contest gates', () => {
  it('uses HIDW- prefix', () => {
    expect(newHiddenWorksSubmissionId().startsWith('HIDW-')).toBe(true);
  });

  it('rejects submissions at or after the deadline cutoff', () => {
    expect(isHiddenWorksContestClosed(new Date(HIDDEN_WORKS_DEADLINE_UTC - 1))).toBe(false);
    expect(isHiddenWorksContestClosed(new Date(HIDDEN_WORKS_DEADLINE_UTC))).toBe(true);
  });

  it('closes once 100 eligible submissions are accepted', () => {
    expect(isEligibleCapReached(99)).toBe(false);
    expect(isEligibleCapReached(HIDDEN_WORKS_ELIGIBLE_CAP)).toBe(true);
  });

  it('does not treat merely received submissions as eligible for the 100 limit', () => {
    // Cap helper only receives the eligible DISTINCT count from event_type=eligible.
    expect(isEligibleCapReached(0)).toBe(false);
  });

  it('does not supply an explicit id in the submission_events INSERT', () => {
    expect(HIDDEN_WORKS_RECEIVED_EVENT_SQL).not.toMatch(/\bid\b\s*,/);
    expect(HIDDEN_WORKS_RECEIVED_EVENT_SQL).toContain('submission_id');
  });
});

describe('hidden works text validation', () => {
  it('rejects a missing required field', () => {
    expectFieldError(
      () => validateHiddenWorksTextFields(baseFields({ work_title: '' }), 'idem-1', now),
      'work_title',
      'required',
    );
  });

  it('rejects lead age radio No', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(baseFields({ age_18_or_older: 'No' }), 'idem-1', now),
      'age_18_or_older',
      '18 years',
    );
  });

  it('rejects DOB under age 18', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({ date_of_birth: '2015-01-01' }),
          'idem-1',
          now,
        ),
      'date_of_birth',
      '18 years',
    );
  });

  it('rejects invalid DOB', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({ date_of_birth: '1990-13-40' }),
          'idem-1',
          now,
        ),
      'date_of_birth',
      'valid date',
    );
  });

  it('rejects malformed lead email', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(baseFields({ email: 'not-an-email' }), 'idem-1', now),
      'email',
      'valid email',
    );
  });

  it('rejects malformed team email', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({
            entry_type: 'Team',
            'team_first_name[]': ['Bo'],
            'team_middle_name[]': [''],
            'team_last_name[]': ['Team'],
            'team_email[]': ['bad-email'],
            'team_country[]': ['United States'],
            'team_affiliation[]': [''],
            'team_public_credit[]': [''],
            'team_typed_legal_name[]': ['Bo Team'],
            team_age_0: 'Yes',
          }),
          'idem-1',
          now,
        ),
      'team_email[]',
      'valid email',
    );
  });

  it('Individual ignores malicious stray team fields', () => {
    const result = validateHiddenWorksTextFields(
      baseFields({
        entry_type: 'Individual',
        'team_first_name[]': ['Evil'],
        'team_middle_name[]': [''],
        'team_last_name[]': ['Actor'],
        'team_email[]': ['evil@example.com'],
        'team_country[]': ['United States'],
        'team_affiliation[]': [''],
        'team_public_credit[]': [''],
        'team_typed_legal_name[]': ['Evil Actor'],
        team_age_0: 'Yes',
      }),
      'idem-1',
      now,
    );
    expect(result.payload.team_members).toBeUndefined();
    expect(result.participantEmails).toEqual(['ada@example.com']);
  });

  it('Team requires at least one member', () => {
    expectFieldError(
      () => validateHiddenWorksTextFields(baseFields({ entry_type: 'Team' }), 'idem-1', now),
      'entry_type',
      'Add at least one team member',
    );
  });

  it('rejects mismatched team arrays', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({
            entry_type: 'Team',
            'team_first_name[]': ['Bo', 'Cy'],
            'team_middle_name[]': [''],
            'team_last_name[]': ['Team'],
            'team_email[]': ['bo@example.com'],
            'team_country[]': ['United States'],
            'team_affiliation[]': [''],
            'team_public_credit[]': [''],
            'team_typed_legal_name[]': ['Bo Team'],
            team_age_0: 'Yes',
          }),
          'idem-1',
          now,
        ),
      '__form__',
      'incomplete or inconsistent',
    );
  });

  it('rejects team age No', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({
            entry_type: 'Team',
            'team_first_name[]': ['Bo'],
            'team_middle_name[]': [''],
            'team_last_name[]': ['Team'],
            'team_email[]': ['bo@example.com'],
            'team_country[]': ['United States'],
            'team_affiliation[]': [''],
            'team_public_credit[]': [''],
            'team_typed_legal_name[]': ['Bo Team'],
            team_age_0: 'No',
          }),
          'idem-1',
          now,
        ),
      'team_age_0',
      'at least 18',
    );
  });

  it('rejects duplicate participant email in the same submission', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({
            entry_type: 'Team',
            'team_first_name[]': ['Bo'],
            'team_middle_name[]': [''],
            'team_last_name[]': ['Team'],
            'team_email[]': ['ada@example.com'],
            'team_country[]': ['United States'],
            'team_affiliation[]': [''],
            'team_public_credit[]': [''],
            'team_typed_legal_name[]': ['Bo Team'],
            team_age_0: 'Yes',
          }),
          'idem-1',
          now,
        ),
      'team_email[]',
      'only once',
    );
  });

  it('requires pen name when public_credit is pen_name', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({ public_credit: 'pen_name', pen_name: '' }),
          'idem-1',
          now,
        ),
      'pen_name',
      'pen name',
    );
  });

  it('requires type_of_work_other when type is Other', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({ type_of_work: 'Other', type_of_work_other: '' }),
          'idem-1',
          now,
        ),
      'type_of_work_other',
      'type of work',
    );
  });

  it('requires larger_work_explain when larger_work is Yes', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({ larger_work: 'Yes', larger_work_explain: '' }),
          'idem-1',
          now,
        ),
      'larger_work_explain',
      'larger work',
    );
  });

  it('requires known English translations when aware = Yes', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({
            english_translation_aware: 'Yes',
            known_english_translations: '',
          }),
          'idem-1',
          now,
        ),
      'known_english_translations',
    );
  });

  it('requires special_components_explain when Yes', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({ special_components: 'Yes', special_components_explain: '' }),
          'idem-1',
          now,
        ),
      'special_components_explain',
      'special components',
    );
  });

  it('requires publication_limitations_explain when Yes', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({
            publication_limitations: 'Yes',
            publication_limitations_explain: '',
          }),
          'idem-1',
          now,
        ),
      'publication_limitations_explain',
    );
  });

  it('requires conflicts_describe when conflicts Yes', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({ conflicts: 'Yes', conflicts_describe: '' }),
          'idem-1',
          now,
        ),
      'conflicts_describe',
      'conflict',
    );
  });

  it('requires outside_assistance_describe when Yes', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({ outside_assistance: 'Yes', outside_assistance_describe: '' }),
          'idem-1',
          now,
        ),
      'outside_assistance_describe',
    );
  });

  it('rejects missing any agreement', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({ agree_eligibility_accuracy: 'no' }),
          'idem-1',
          now,
        ),
      'agree_eligibility_accuracy',
      'accept this agreement',
    );
  });

  it('rejects reader_facing_case below 500 words', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({ reader_facing_case: words(499) }),
          'idem-1',
          now,
        ),
      'reader_facing_case',
      'at least 500',
    );
  });

  it('rejects reader_facing_case above 1000 words', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({ reader_facing_case: words(1001) }),
          'idem-1',
          now,
        ),
      'reader_facing_case',
      'at most 1,000',
    );
  });

  it('rejects invalid URL scheme', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({ primary_bibliographic_source: 'javascript:alert(1)' }),
          'idem-1',
          now,
        ),
      'primary_bibliographic_source',
      'http or https',
    );
  });

  it('rejects invalid word_count', () => {
    expectFieldError(
      () => validateHiddenWorksTextFields(baseFields({ word_count: '0' }), 'idem-1', now),
      'word_count',
      'greater than zero',
    );
    expectFieldError(
      () => validateHiddenWorksTextFields(baseFields({ word_count: '12.5' }), 'idem-1', now),
      'word_count',
      'greater than zero',
    );
  });

  it('normalizes team_members and participant_emails', () => {
    const result = validateHiddenWorksTextFields(
      baseFields({
        entry_type: 'Team',
        'team_first_name[]': ['Bo'],
        'team_middle_name[]': ['Q'],
        'team_last_name[]': ['Team'],
        'team_email[]': ['Bo.Team@Example.com'],
        'team_country[]': ['United States'],
        'team_affiliation[]': ['Lab'],
        'team_public_credit[]': ['B. Team'],
        'team_typed_legal_name[]': ['Bo Q Team'],
        team_age_0: 'Yes',
      }),
      'idem-1',
      now,
    );
    expect(result.payload.team_members).toEqual([
      {
        legal_first_name: 'Bo',
        legal_middle_name: 'Q',
        legal_last_name: 'Team',
        email: 'bo.team@example.com',
        country: 'United States',
        affiliation: 'Lab',
        public_credit: 'B. Team',
        age_18_or_older: 'Yes',
        typed_legal_name: 'Bo Q Team',
      },
    ]);
    expect(result.participantEmails).toEqual(['ada@example.com', 'bo.team@example.com']);
    expect(result.payload).not.toHaveProperty('team_first_name[]');
    expect(result.payload).not.toHaveProperty('team_age_0');
  });

  it('overwrites browser submission_date with server-controlled Chicago date', () => {
    const result = validateHiddenWorksTextFields(baseFields(), 'idem-1', now);
    expect(result.payload.submission_date).not.toBe('2000-01-01');
    expect(result.payload.submission_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('excludes Turnstile token and idempotency key from payload and has no file binary data', () => {
    const fd = new FormData();
    fd.set('work_title', 'Example');
    fd.set('cf-turnstile-response', 'secret-token');
    fd.set('submission_idempotency_key', 'idem-xyz');
    fd.set('resume', new File([new Uint8Array([1, 2, 3])], 'x.pdf', { type: 'application/pdf' }));
    const { fields } = collectHiddenWorksTextFields(fd);
    expect(fields).not.toHaveProperty('cf-turnstile-response');
    expect(fields).not.toHaveProperty('submission_idempotency_key');
    expect(JSON.stringify(fields)).not.toContain('secret-token');
    expect(fields).not.toHaveProperty('resume');
  });
});

describe('hidden works files', () => {
  it('rejects unsupported file field', () => {
    const fd = new FormData();
    fd.set('full_book', new File([new Uint8Array(10)], 'book.pdf', { type: 'application/pdf' }));
    expectFieldError(
      () => validateHiddenWorksFiles(fd),
      '__form__',
      'unexpected file field',
    );
  });

  it('rejects empty selected file', () => {
    const fd = new FormData();
    fd.set(
      'supporting_evidence',
      new File([], 'empty.pdf', { type: 'application/pdf' }),
    );
    expectFieldError(
      () => validateHiddenWorksFiles(fd),
      'supporting_evidence',
      'empty',
    );
  });

  it('rejects unsupported file type', () => {
    const fd = new FormData();
    fd.set(
      'supporting_evidence',
      new File([new Uint8Array(10)], 'notes.txt', { type: 'text/plain' }),
    );
    expectFieldError(
      () => validateHiddenWorksFiles(fd),
      'supporting_evidence',
      'not supported',
    );
  });

  it('rejects file over 10 MiB', () => {
    const fd = new FormData();
    fd.set(
      'supporting_evidence',
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.pdf', {
        type: 'application/pdf',
      }),
    );
    expectFieldError(
      () => validateHiddenWorksFiles(fd),
      'supporting_evidence',
      '10 MB or smaller',
    );
  });

  it('rejects multiple supporting_rights_documentation files', () => {
    const fd = new FormData();
    fd.append(
      'supporting_rights_documentation',
      new File([new Uint8Array(8)], 'a.pdf', { type: 'application/pdf' }),
    );
    fd.append(
      'supporting_rights_documentation',
      new File([new Uint8Array(8)], 'b.pdf', { type: 'application/pdf' }),
    );
    expectFieldError(
      () => validateHiddenWorksFiles(fd),
      'supporting_rights_documentation',
      'only one supporting rights document',
    );
  });

  it('rejects total files over 40 MiB', () => {
    const fd = new FormData();
    const chunk = new Uint8Array(10 * 1024 * 1024);
    for (let i = 0; i < 5; i += 1) {
      fd.append(
        'supporting_evidence',
        new File([chunk], `e${i}.pdf`, { type: 'application/pdf' }),
      );
    }
    expect(HIDDEN_WORKS_MAX_TOTAL_FILE_BYTES).toBe(40 * 1024 * 1024);
    expectFieldError(
      () => validateHiddenWorksFiles(fd),
      '__form__',
      '40 MB in total',
    );
  });

  it('rejects more than 20 files', () => {
    const fd = new FormData();
    for (let i = 0; i < HIDDEN_WORKS_MAX_FILE_COUNT + 1; i += 1) {
      fd.append(
        'additional_documents',
        new File([new Uint8Array(8)], `d${i}.pdf`, { type: 'application/pdf' }),
      );
    }
    expectFieldError(
      () => validateHiddenWorksFiles(fd),
      '__form__',
      'no more than 20',
    );
  });

  it('never puts original filenames into R2 object keys', () => {
    const original = 'My Secret Evidence.PDF';
    const key = buildHiddenWorksObjectKey(
      'HIDW-abc',
      'supporting_evidence',
      '550e8400-e29b-41d4-a716-446655440000',
      'pdf',
    );
    expect(key).toBe(
      'hidden-works/HIDW-abc/supporting_evidence/550e8400-e29b-41d4-a716-446655440000.pdf',
    );
    expect(key.includes(original)).toBe(false);
  });
});

describe('turnstile and idempotency helpers', () => {
  it('rejects Turnstile action mismatch', () => {
    expect(
      isTurnstileAccepted(
        { success: true, action: 'volunteer_submit', hostname: 'example.com' },
        HIDDEN_WORKS_TURNSTILE_ACTION,
        'example.com',
      ),
    ).toBe(false);
  });

  it('rejects Turnstile hostname mismatch', () => {
    expect(
      isTurnstileAccepted(
        {
          success: true,
          action: HIDDEN_WORKS_TURNSTILE_ACTION,
          hostname: 'evil.example',
        },
        HIDDEN_WORKS_TURNSTILE_ACTION,
        'example.com',
      ),
    ).toBe(false);
  });

  it('idempotency replay returns existing HIDW ID', () => {
    const replay = existingHiddenWorksSubmissionResponse(
      'HIDW-2450fdd4-d6c2-43b6-bd87-af7edccf5584',
    );
    expect(replay.status).toBe(200);
    expect(replay.body.duplicate).toBe(true);
    expect(replay.body.submission_id.startsWith('HIDW-')).toBe(true);
  });

  it('idempotent replay semantics still succeed conceptually after contest closure', () => {
    const closed = isHiddenWorksContestClosed(new Date(HIDDEN_WORKS_DEADLINE_UTC));
    expect(closed).toBe(true);
    const replay = existingHiddenWorksSubmissionResponse('HIDW-existing');
    // Handler checks idempotency before contest_closed; replay payload remains success.
    expect(replay.body.success).toBe(true);
    expect(replay.body.duplicate).toBe(true);
  });

  it('two-entry limit rejects a third submission for a participant', () => {
    const existing = [
      {
        email: 'ada@example.com',
        payload_json: JSON.stringify({ participant_emails: ['ada@example.com'] }),
      },
      {
        email: 'ada@example.com',
        payload_json: JSON.stringify({ participant_emails: ['ada@example.com'] }),
      },
    ];
    expect(hasReachedEntryLimit(['ada@example.com'], existing)).toBe(true);
    expect(hasReachedEntryLimit(['other@example.com'], existing)).toBe(false);
  });

  it('falls back to top-level email when participant_emails is absent', () => {
    const existing = [
      { email: 'legacy@example.com', payload_json: '{}' },
      { email: 'legacy@example.com', payload_json: null },
    ];
    expect(hasReachedEntryLimit(['legacy@example.com'], existing)).toBe(true);
  });
});

describe('unexpected fields', () => {
  it('rejects unexpected non-file field names', () => {
    const fd = new FormData();
    fd.set('evil_field', 'nope');
    expectFieldError(
      () => collectHiddenWorksTextFields(fd),
      '__form__',
      'unexpected form field',
    );
  });

  it('rejects overlong text field with field-specific message', () => {
    const fd = new FormData();
    fd.set('work_title', 'x'.repeat(MAX_STRING_CHARS + 1));
    expectFieldError(() => collectHiddenWorksTextFields(fd), 'work_title', 'too long');
  });
});

describe('hidden works validation error mapping', () => {
  it('maps FieldValidationError to 400 with field and message', async () => {
    const response = hiddenWorksValidationErrorResponse(
      new FieldValidationError('work_title', 'This field is required.'),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: 'invalid_submission',
      field: 'work_title',
      message: 'This field is required.',
    });
  });

  it('maps unexpected internal exceptions to HTTP 500 submission_failed', async () => {
    const response = hiddenWorksValidationErrorResponse(new Error('boom'));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ success: false, error: 'submission_failed' });
    expect(body).not.toHaveProperty('message');
    expect(JSON.stringify(body)).not.toContain('boom');
  });

  it('maps retained ValidationError to generic 400 invalid_submission', async () => {
    const response = hiddenWorksValidationErrorResponse(new ValidationError());
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'invalid_submission',
    });
  });
});

describe('hidden works agreement version and consolidated checkboxes', () => {
  it('uses v2 agreement version and exactly four agreement names', () => {
    expect(HIDDEN_WORKS_AGREEMENT_VERSION).toBe('hidden-works-2026-09-25-v2');
    expect([...HIDDEN_WORKS_AGREEMENTS]).toEqual([
      'agree_eligibility_accuracy',
      'agree_rights_materials',
      'agree_contest_administration',
      'agree_rules_privacy',
    ]);
  });

  it('accepts all four agreement checkboxes set to yes', () => {
    const result = validateHiddenWorksTextFields(baseFields(), 'idem-1', now);
    for (const name of HIDDEN_WORKS_AGREEMENTS) {
      expect(result.payload[name]).toBe('yes');
    }
    expect(result.payload).not.toHaveProperty('agree_age_identity');
    expect(result.payload).not.toHaveProperty('agree_official_rules');
  });

  it('rejects omitting any one of the four agreements', () => {
    for (const name of HIDDEN_WORKS_AGREEMENTS) {
      expectFieldError(
        () =>
          validateHiddenWorksTextFields(baseFields({ [name]: '' }), 'idem-1', now),
        name,
        'accept this agreement',
      );
    }
  });

  it('does not accept retired individual agreement fields as substitutes', () => {
    const fd = new FormData();
    fd.set('agree_age_identity', 'yes');
    expectFieldError(
      () => collectHiddenWorksTextFields(fd),
      '__form__',
      'unexpected form field',
    );

    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({
            agree_eligibility_accuracy: '',
            agree_age_identity: 'yes',
          }),
          'idem-1',
          now,
        ),
      'agree_eligibility_accuracy',
      'accept this agreement',
    );
  });

  it('preserves all 28 clause titles in agreementGroups with Privacy Policy link', async () => {
    const { hiddenWorksSubmitContent } = await import(
      '../src/content/projects/hidden-works-submit'
    );
    const groups = hiddenWorksSubmitContent.agreementGroups;
    expect(groups).toHaveLength(4);
    expect(groups.map((g) => g.name)).toEqual([...HIDDEN_WORKS_AGREEMENTS]);

    const titles = groups.flatMap((g) => g.clauses.map((c) => c.title));
    expect(titles).toHaveLength(28);
    expect(titles).toEqual([
      'Age and Legal Identity',
      'Entrant Eligibility',
      'Entry Limit',
      'Accuracy of Submission',
      'Eligibility Verification',
      'Initial Eligibility Review and Submission Limit',
      'Identity and Age Verification',
      'Legal Name and Pen Name',
      'Source and Access Disclosures',
      'Original Submission',
      'Public-Domain Requirement',
      'Third-Party Rights',
      'No Ownership Claim in the Historical Work',
      'Use of Submission Materials',
      'Ownership of My Original Submission Material',
      'Submitted Materials Will Not Be Returned',
      'No Confidentiality',
      'Additional Information and Documentation',
      'Selection Is Not Guaranteed',
      'Disqualification',
      'Selected Works',
      'Public Credit',
      'Publication and Editorial Development',
      'No Cash Prize or Automatic Financial Interest',
      'Notification Requirement',
      'No Entry Fee or Purchase Requirement',
      'Privacy Policy',
      'Official Contest Rules and Submission Agreement',
    ]);

    const privacy = groups
      .flatMap((g) => g.clauses)
      .find((c) => c.title === 'Privacy Policy');
    expect(privacy?.link).toEqual({ text: 'Privacy Policy', href: '/privacy' });
  });

  it('requires conditional pen_name with a field message', () => {
    expectFieldError(
      () =>
        validateHiddenWorksTextFields(
          baseFields({ public_credit: 'pen_name', pen_name: '' }),
          'idem-1',
          now,
        ),
      'pen_name',
      'pen name',
    );
  });
});

// Ensure volunteer suite remains independently runnable; smoke-import shared helpers.
describe('shared volunteer helpers still importable', () => {
  it('keeps volunteer response helpers intact', async () => {
    const mod = await import('../worker/forms/common');
    expect(mod.newVolunteerSubmissionResponse('VOL-1').status).toBe(201);
  });
});
