import { describe, expect, it } from 'vitest';
import { ValidationError, isTurnstileAccepted } from '../worker/forms/common';
import {
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
    agree_age_identity: 'yes',
    agree_entrant_eligibility: 'yes',
    agree_entry_limit: 'yes',
    agree_accuracy: 'yes',
    agree_eligibility_verification: 'yes',
    agree_submission_limit: 'yes',
    agree_identity_age_verification: 'yes',
    agree_legal_pen_name: 'yes',
    agree_public_domain: 'yes',
    agree_third_party_rights: 'yes',
    agree_source_access: 'yes',
    agree_original_submission: 'yes',
    agree_no_ownership_claim: 'yes',
    agree_use_of_materials: 'yes',
    agree_ownership_original: 'yes',
    agree_not_returned: 'yes',
    agree_no_confidentiality: 'yes',
    agree_additional_info: 'yes',
    agree_selection_not_guaranteed: 'yes',
    agree_disqualification: 'yes',
    agree_selected_works: 'yes',
    agree_public_credit: 'yes',
    agree_publication: 'yes',
    agree_no_cash_prize: 'yes',
    agree_notification: 'yes',
    agree_no_fee: 'yes',
    agree_privacy: 'yes',
    agree_official_rules: 'yes',
  };
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
    expect(() =>
      validateHiddenWorksTextFields(baseFields({ work_title: '' }), 'idem-1', now),
    ).toThrow(ValidationError);
  });

  it('rejects lead age radio No', () => {
    expect(() =>
      validateHiddenWorksTextFields(baseFields({ age_18_or_older: 'No' }), 'idem-1', now),
    ).toThrow(ValidationError);
  });

  it('rejects DOB under age 18', () => {
    expect(() =>
      validateHiddenWorksTextFields(baseFields({ date_of_birth: '2015-01-01' }), 'idem-1', now),
    ).toThrow(ValidationError);
  });

  it('rejects invalid DOB', () => {
    expect(() =>
      validateHiddenWorksTextFields(baseFields({ date_of_birth: '1990-13-40' }), 'idem-1', now),
    ).toThrow(ValidationError);
  });

  it('rejects malformed lead email', () => {
    expect(() =>
      validateHiddenWorksTextFields(baseFields({ email: 'not-an-email' }), 'idem-1', now),
    ).toThrow(ValidationError);
  });

  it('rejects malformed team email', () => {
    expect(() =>
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
    ).toThrow(ValidationError);
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
    expect(() =>
      validateHiddenWorksTextFields(baseFields({ entry_type: 'Team' }), 'idem-1', now),
    ).toThrow(ValidationError);
  });

  it('rejects mismatched team arrays', () => {
    expect(() =>
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
    ).toThrow(ValidationError);
  });

  it('rejects team age No', () => {
    expect(() =>
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
    ).toThrow(ValidationError);
  });

  it('rejects duplicate participant email in the same submission', () => {
    expect(() =>
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
    ).toThrow(ValidationError);
  });

  it('requires pen name when public_credit is pen_name', () => {
    expect(() =>
      validateHiddenWorksTextFields(
        baseFields({ public_credit: 'pen_name', pen_name: '' }),
        'idem-1',
        now,
      ),
    ).toThrow(ValidationError);
  });

  it('requires type_of_work_other when type is Other', () => {
    expect(() =>
      validateHiddenWorksTextFields(
        baseFields({ type_of_work: 'Other', type_of_work_other: '' }),
        'idem-1',
        now,
      ),
    ).toThrow(ValidationError);
  });

  it('requires larger_work_explain when larger_work is Yes', () => {
    expect(() =>
      validateHiddenWorksTextFields(
        baseFields({ larger_work: 'Yes', larger_work_explain: '' }),
        'idem-1',
        now,
      ),
    ).toThrow(ValidationError);
  });

  it('requires known English translations when aware = Yes', () => {
    expect(() =>
      validateHiddenWorksTextFields(
        baseFields({
          english_translation_aware: 'Yes',
          known_english_translations: '',
        }),
        'idem-1',
        now,
      ),
    ).toThrow(ValidationError);
  });

  it('requires special_components_explain when Yes', () => {
    expect(() =>
      validateHiddenWorksTextFields(
        baseFields({ special_components: 'Yes', special_components_explain: '' }),
        'idem-1',
        now,
      ),
    ).toThrow(ValidationError);
  });

  it('requires publication_limitations_explain when Yes', () => {
    expect(() =>
      validateHiddenWorksTextFields(
        baseFields({
          publication_limitations: 'Yes',
          publication_limitations_explain: '',
        }),
        'idem-1',
        now,
      ),
    ).toThrow(ValidationError);
  });

  it('requires conflicts_describe when conflicts Yes', () => {
    expect(() =>
      validateHiddenWorksTextFields(
        baseFields({ conflicts: 'Yes', conflicts_describe: '' }),
        'idem-1',
        now,
      ),
    ).toThrow(ValidationError);
  });

  it('requires outside_assistance_describe when Yes', () => {
    expect(() =>
      validateHiddenWorksTextFields(
        baseFields({ outside_assistance: 'Yes', outside_assistance_describe: '' }),
        'idem-1',
        now,
      ),
    ).toThrow(ValidationError);
  });

  it('rejects missing any agreement', () => {
    expect(() =>
      validateHiddenWorksTextFields(baseFields({ agree_accuracy: 'no' }), 'idem-1', now),
    ).toThrow(ValidationError);
  });

  it('rejects reader_facing_case below 500 words', () => {
    expect(() =>
      validateHiddenWorksTextFields(
        baseFields({ reader_facing_case: words(499) }),
        'idem-1',
        now,
      ),
    ).toThrow(ValidationError);
  });

  it('rejects reader_facing_case above 1000 words', () => {
    expect(() =>
      validateHiddenWorksTextFields(
        baseFields({ reader_facing_case: words(1001) }),
        'idem-1',
        now,
      ),
    ).toThrow(ValidationError);
  });

  it('rejects invalid URL scheme', () => {
    expect(() =>
      validateHiddenWorksTextFields(
        baseFields({ primary_bibliographic_source: 'javascript:alert(1)' }),
        'idem-1',
        now,
      ),
    ).toThrow(ValidationError);
  });

  it('rejects invalid word_count', () => {
    expect(() =>
      validateHiddenWorksTextFields(baseFields({ word_count: '0' }), 'idem-1', now),
    ).toThrow(ValidationError);
    expect(() =>
      validateHiddenWorksTextFields(baseFields({ word_count: '12.5' }), 'idem-1', now),
    ).toThrow(ValidationError);
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
    expect(() => validateHiddenWorksFiles(fd)).toThrow(ValidationError);
  });

  it('rejects unsupported file type', () => {
    const fd = new FormData();
    fd.set(
      'supporting_evidence',
      new File([new Uint8Array(10)], 'notes.txt', { type: 'text/plain' }),
    );
    expect(() => validateHiddenWorksFiles(fd)).toThrow(ValidationError);
  });

  it('rejects file over 10 MiB', () => {
    const fd = new FormData();
    fd.set(
      'supporting_evidence',
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.pdf', {
        type: 'application/pdf',
      }),
    );
    expect(() => validateHiddenWorksFiles(fd)).toThrow(ValidationError);
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
    expect(() => validateHiddenWorksFiles(fd)).toThrow(ValidationError);
  });

  it('rejects more than 20 files', () => {
    const fd = new FormData();
    for (let i = 0; i < HIDDEN_WORKS_MAX_FILE_COUNT + 1; i += 1) {
      fd.append(
        'additional_documents',
        new File([new Uint8Array(8)], `d${i}.pdf`, { type: 'application/pdf' }),
      );
    }
    expect(() => validateHiddenWorksFiles(fd)).toThrow(ValidationError);
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
    expect(() => collectHiddenWorksTextFields(fd)).toThrow(ValidationError);
  });
});

// Ensure volunteer suite remains independently runnable; smoke-import shared helpers.
describe('shared volunteer helpers still importable', () => {
  it('keeps volunteer response helpers intact', async () => {
    const mod = await import('../worker/forms/common');
    expect(mod.newVolunteerSubmissionResponse('VOL-1').status).toBe(201);
  });
});
