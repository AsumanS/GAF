import { workTypeOptions } from '../../src/content/projects/hidden-works-submit';
import type { Env } from '../env';
import {
  MAX_SINGLE_FILE_BYTES,
  MAX_STRING_CHARS,
  MAX_TOTAL_TEXT_BYTES,
  MAX_PHONE_CHARS,
  TextTooLargeError,
  ValidationError,
  FieldValidationError,
  chicagoCalendarDate,
  contentLengthTooLarge,
  countWhitespaceSeparatedWords,
  isAtLeastAgeOnChicagoDate,
  isHttpOrHttpsUrl,
  isMultipartFormData,
  isValidEmail,
  jsonResponse,
  methodNotAllowed,
  newEntityId,
  requireSameOrigin,
  sanitizeOriginalFilename,
  validateUploadedFile,
  verifyTurnstileToken,
  type AllowedFileSpec,
  type ApiSuccessBody,
  type ValidatedUpload,
} from './common';

export const HIDDEN_WORKS_AGREEMENT_VERSION = 'hidden-works-2026-09-25-v2';
export const HIDDEN_WORKS_TURNSTILE_ACTION = 'hidden_works_submit';
export const HIDDEN_WORKS_FORM_TYPE = 'hidden_works';
export const HIDDEN_WORKS_MAX_REQUEST_BYTES = 42 * 1024 * 1024;
export const HIDDEN_WORKS_MAX_TOTAL_FILE_BYTES = 40 * 1024 * 1024;
export const HIDDEN_WORKS_MAX_FILE_COUNT = 20;
export const HIDDEN_WORKS_ELIGIBLE_CAP = 100;
export const HIDDEN_WORKS_ENTRY_LIMIT = 2;
/** Contest closes at May 31, 2027 11:59 p.m. Central Time. */
export const HIDDEN_WORKS_DEADLINE_UTC = Date.parse('2027-06-01T05:00:00.000Z');

export const HIDDEN_WORKS_RECEIVED_EVENT_SQL = `INSERT INTO submission_events (
          submission_id, event_type, actor, previous_status, new_status, metadata_json
        ) VALUES (?, 'received', 'system', NULL, 'received', NULL)`;

export const HIDDEN_WORKS_AGREEMENTS = [
  'agree_eligibility_accuracy',
  'agree_rights_materials',
  'agree_contest_administration',
  'agree_rules_privacy',
] as const;

function fieldFail(field: string, message: string): never {
  throw new FieldValidationError(field, message);
}

const TEAM_ARRAY_FIELDS = [
  'team_first_name[]',
  'team_middle_name[]',
  'team_last_name[]',
  'team_email[]',
  'team_country[]',
  'team_affiliation[]',
  'team_public_credit[]',
  'team_typed_legal_name[]',
] as const;

const ALLOWED_TEXT_FIELDS = new Set<string>([
  'entry_type',
  'legal_first_name',
  'legal_middle_name',
  'legal_last_name',
  'email',
  'phone',
  'date_of_birth',
  'country',
  'state_region',
  'city',
  'affiliation',
  'age_18_or_older',
  'public_credit',
  'pen_name',
  'work_title',
  'original_language_title',
  'alternate_titles',
  'author_creator',
  'author_creator_dates',
  'original_language',
  'country_or_place_of_origin',
  'first_publication_date',
  'place_of_first_publication',
  'original_publisher',
  'type_of_work',
  'type_of_work_other',
  'competition_category',
  'category_explain',
  'publication_evidence',
  'primary_bibliographic_source',
  'additional_supporting_source',
  'bibliographic_citations',
  'source_access',
  'source_url',
  'repository',
  'shelfmark',
  'source_accessible',
  'access_restrictions',
  'word_count',
  'page_count',
  'scope_estimate',
  'larger_work',
  'larger_work_explain',
  'public_domain_why',
  'public_domain_source',
  'public_domain_edition',
  'english_translation_aware',
  'known_english_translations',
  'english_edition_us',
  'english_edition_explain',
  'variants_searched',
  'sources_searched',
  'search_dates_terms',
  'apparent_matches',
  'match_explain',
  'reader_facing_case',
  'how_discovered',
  'translation_challenges',
  'special_components',
  'special_components_explain',
  'publication_limitations',
  'publication_limitations_explain',
  'conflicts',
  'conflicts_describe',
  'outside_assistance',
  'outside_assistance_describe',
  'key_sources',
  'additional_links',
  'anything_else',
  'typed_legal_name',
  'submission_date',
  ...HIDDEN_WORKS_AGREEMENTS,
  ...TEAM_ARRAY_FIELDS,
]);

const REQUIRED_LEAD_FIELDS = [
  'entry_type',
  'legal_first_name',
  'legal_last_name',
  'email',
  'phone',
  'date_of_birth',
  'country',
  'state_region',
  'city',
  'age_18_or_older',
  'public_credit',
  'work_title',
  'author_creator',
  'original_language',
  'country_or_place_of_origin',
  'first_publication_date',
  'place_of_first_publication',
  'type_of_work',
  'competition_category',
  'category_explain',
  'publication_evidence',
  'primary_bibliographic_source',
  'bibliographic_citations',
  'source_access',
  'source_accessible',
  'word_count',
  'larger_work',
  'public_domain_why',
  'english_translation_aware',
  'english_edition_us',
  'english_edition_explain',
  'variants_searched',
  'sources_searched',
  'search_dates_terms',
  'apparent_matches',
  'match_explain',
  'reader_facing_case',
  'how_discovered',
  'translation_challenges',
  'special_components',
  'publication_limitations',
  'conflicts',
  'outside_assistance',
  'key_sources',
  'typed_legal_name',
] as const;

const PDF_IMAGE_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);
const DOC_PDF_IMAGE_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]);
const SEARCH_DOC_MIME = new Set([
  ...DOC_PDF_IMAGE_MIME,
  'text/csv',
  'application/csv',
  'text/plain',
]);

export const SUPPORTING_EVIDENCE_SPEC: AllowedFileSpec = {
  fieldName: 'supporting_evidence',
  required: false,
  maxBytes: MAX_SINGLE_FILE_BYTES,
  allowedMimeTypes: PDF_IMAGE_MIME,
  allowedExtensions: new Set(['pdf', 'jpg', 'jpeg', 'png']),
};

export const SUPPORTING_RIGHTS_SPEC: AllowedFileSpec = {
  fieldName: 'supporting_rights_documentation',
  required: false,
  maxBytes: MAX_SINGLE_FILE_BYTES,
  allowedMimeTypes: DOC_PDF_IMAGE_MIME,
  allowedExtensions: new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']),
};

export const SUPPORTING_SEARCH_SPEC: AllowedFileSpec = {
  fieldName: 'supporting_search_records',
  required: false,
  maxBytes: MAX_SINGLE_FILE_BYTES,
  allowedMimeTypes: SEARCH_DOC_MIME,
  allowedExtensions: new Set(['pdf', 'doc', 'docx', 'csv', 'txt', 'jpg', 'jpeg', 'png']),
};

export const ADDITIONAL_DOCUMENTS_SPEC: AllowedFileSpec = {
  fieldName: 'additional_documents',
  required: false,
  maxBytes: MAX_SINGLE_FILE_BYTES,
  allowedMimeTypes: SEARCH_DOC_MIME,
  allowedExtensions: new Set(['pdf', 'doc', 'docx', 'csv', 'txt', 'jpg', 'jpeg', 'png']),
};

const FILE_FIELD_SPECS: Record<string, AllowedFileSpec> = {
  supporting_evidence: SUPPORTING_EVIDENCE_SPEC,
  supporting_rights_documentation: SUPPORTING_RIGHTS_SPEC,
  supporting_search_records: SUPPORTING_SEARCH_SPEC,
  additional_documents: ADDITIONAL_DOCUMENTS_SPEC,
};

export type TeamMemberPayload = {
  legal_first_name: string;
  legal_middle_name: string;
  legal_last_name: string;
  email: string;
  country: string;
  affiliation: string;
  public_credit: string;
  age_18_or_older: 'Yes';
  typed_legal_name: string;
};

export type HiddenWorksValidated = {
  payload: Record<string, unknown>;
  payloadJson: string;
  legalName: string;
  email: string;
  idempotencyKey: string;
  participantEmails: string[];
};

function single(
  fields: Record<string, string | string[]>,
  key: string,
): string {
  const value = fields[key];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function allValues(
  fields: Record<string, string | string[]>,
  key: string,
): string[] {
  const value = fields[key];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function isAllowedTextFieldName(name: string): boolean {
  if (ALLOWED_TEXT_FIELDS.has(name)) return true;
  return /^team_age_\d+$/.test(name);
}

export function newHiddenWorksSubmissionId(): string {
  return `HIDW-${crypto.randomUUID()}`;
}

export function isHiddenWorksContestClosed(now: Date = new Date()): boolean {
  return now.getTime() >= HIDDEN_WORKS_DEADLINE_UTC;
}

export function isEligibleCapReached(eligibleDistinctCount: number): boolean {
  return eligibleDistinctCount >= HIDDEN_WORKS_ELIGIBLE_CAP;
}

export function existingHiddenWorksSubmissionResponse(submissionId: string): {
  status: 200;
  body: ApiSuccessBody;
} {
  return {
    status: 200,
    body: {
      success: true,
      submission_id: submissionId,
      duplicate: true,
    },
  };
}

export function newHiddenWorksSubmissionResponse(submissionId: string): {
  status: 201;
  body: ApiSuccessBody;
} {
  return {
    status: 201,
    body: {
      success: true,
      submission_id: submissionId,
      duplicate: false,
    },
  };
}

export function buildHiddenWorksObjectKey(
  submissionId: string,
  fieldName: string,
  fileUuid: string,
  validatedExtension: string,
): string {
  return `hidden-works/${submissionId}/${fieldName}/${fileUuid}.${validatedExtension}`;
}

export function collectHiddenWorksTextFields(formData: FormData): {
  fields: Record<string, string | string[]>;
  totalTextBytes: number;
} {
  const collected: Record<string, string[]> = {};
  let totalTextBytes = 0;

  for (const [key, value] of formData.entries()) {
    if (typeof value !== 'string') continue;
    if (key === 'cf-turnstile-response' || key === 'submission_idempotency_key') {
      continue;
    }
    if (!isAllowedTextFieldName(key)) {
      fieldFail(
        '__form__',
        'The submission contains an unexpected form field. Please refresh the page and try again.',
      );
    }
    if (value.length > MAX_STRING_CHARS) {
      fieldFail(key, 'This field is too long.');
    }
    const trimmed = value.trim();
    totalTextBytes += new TextEncoder().encode(trimmed).byteLength;
    if (totalTextBytes > MAX_TOTAL_TEXT_BYTES) {
      throw new TextTooLargeError();
    }
    if (!collected[key]) collected[key] = [];
    collected[key].push(trimmed);
  }

  const fields: Record<string, string | string[]> = {};
  for (const [key, values] of Object.entries(collected)) {
    fields[key] = values.length === 1 ? values[0]! : values;
  }
  return { fields, totalTextBytes };
}

function requireHttpUrl(value: string, field: string, required: boolean): string | undefined {
  if (!value) {
    if (required) fieldFail(field, 'This field is required.');
    return undefined;
  }
  if (!isHttpOrHttpsUrl(value)) {
    fieldFail(field, 'Enter a valid http or https URL.');
  }
  return value;
}

function assertValidAdultDateOfBirth(dateOfBirth: string, onDate: Date): void {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth.trim());
  if (!match) {
    fieldFail('date_of_birth', 'Enter a valid date of birth.');
  }
  const year = Number(match![1]);
  const month = Number(match![2]);
  const day = Number(match![3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    fieldFail('date_of_birth', 'Enter a valid date of birth.');
  }

  const today = chicagoCalendarDate(onDate);
  const todayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
  if (!todayMatch) {
    fieldFail('date_of_birth', 'Enter a valid date of birth.');
  }
  const ty = Number(todayMatch![1]);
  const tm = Number(todayMatch![2]);
  const td = Number(todayMatch![3]);
  if (year > ty || (year === ty && month > tm) || (year === ty && month === tm && day > td)) {
    fieldFail('date_of_birth', 'Enter a valid date of birth.');
  }

  if (!isAtLeastAgeOnChicagoDate(dateOfBirth, onDate, 18)) {
    fieldFail('date_of_birth', 'You must be at least 18 years old to enter.');
  }
}

function normalizeTeamMembers(
  fields: Record<string, string | string[]>,
  leadEmail: string,
): { teamMembers: TeamMemberPayload[]; participantEmails: string[] } {
  const entryType = single(fields, 'entry_type');
  if (entryType === 'Individual') {
    return { teamMembers: [], participantEmails: [leadEmail] };
  }
  if (entryType !== 'Team') {
    fieldFail('entry_type', 'This field is required.');
  }

  const firstNames = allValues(fields, 'team_first_name[]');
  const middleNames = allValues(fields, 'team_middle_name[]');
  const lastNames = allValues(fields, 'team_last_name[]');
  const emails = allValues(fields, 'team_email[]');
  const countries = allValues(fields, 'team_country[]');
  const affiliations = allValues(fields, 'team_affiliation[]');
  const publicCredits = allValues(fields, 'team_public_credit[]');
  const typedNames = allValues(fields, 'team_typed_legal_name[]');

  const count = firstNames.length;
  if (count < 1) {
    fieldFail('entry_type', 'Add at least one team member.');
  }

  if (
    firstNames.length !== count ||
    middleNames.length !== count ||
    lastNames.length !== count ||
    emails.length !== count ||
    countries.length !== count ||
    affiliations.length !== count ||
    publicCredits.length !== count ||
    typedNames.length !== count
  ) {
    fieldFail(
      '__form__',
      'The team member information is incomplete or inconsistent. Please review the team section.',
    );
  }

  const teamMembers: TeamMemberPayload[] = [];
  const seen = new Set<string>([leadEmail]);

  for (let i = 0; i < count; i += 1) {
    const first = (firstNames[i] ?? '').trim();
    const last = (lastNames[i] ?? '').trim();
    const email = (emails[i] ?? '').trim().toLowerCase();
    const country = (countries[i] ?? '').trim();
    const typed = (typedNames[i] ?? '').trim();
    const age = single(fields, `team_age_${i}`);

    if (!first || !last || !email || !country || !typed) {
      fieldFail('entry_type', 'Please complete all required team member fields.');
    }
    if (!isValidEmail(email)) {
      fieldFail('team_email[]', 'Enter a valid email address.');
    }
    if (age !== 'Yes') {
      fieldFail(`team_age_${i}`, 'Each team member must be at least 18 years old.');
    }
    if (seen.has(email)) {
      fieldFail('team_email[]', 'Each participant email may appear only once in a submission.');
    }
    seen.add(email);

    teamMembers.push({
      legal_first_name: first,
      legal_middle_name: (middleNames[i] ?? '').trim(),
      legal_last_name: last,
      email,
      country,
      affiliation: (affiliations[i] ?? '').trim(),
      public_credit: (publicCredits[i] ?? '').trim(),
      age_18_or_older: 'Yes',
      typed_legal_name: typed,
    });
  }

  return {
    teamMembers,
    participantEmails: Array.from(seen),
  };
}

export function validateHiddenWorksTextFields(
  fields: Record<string, string | string[]>,
  idempotencyKeyRaw: string | null,
  now: Date = new Date(),
): HiddenWorksValidated {
  const idempotencyKey = (idempotencyKeyRaw ?? '').trim();
  if (!idempotencyKey) {
    fieldFail('submission_idempotency_key', 'This field is required.');
  }

  for (const key of REQUIRED_LEAD_FIELDS) {
    if (!single(fields, key)) {
      fieldFail(key, 'This field is required.');
    }
  }

  const entryType = single(fields, 'entry_type');
  if (entryType !== 'Individual' && entryType !== 'Team') {
    fieldFail('entry_type', 'This field is required.');
  }

  if (single(fields, 'age_18_or_older') !== 'Yes') {
    fieldFail('age_18_or_older', 'You must be at least 18 years old to enter.');
  }

  assertValidAdultDateOfBirth(single(fields, 'date_of_birth'), now);

  const email = single(fields, 'email').toLowerCase();
  if (!isValidEmail(email)) {
    fieldFail('email', 'Enter a valid email address.');
  }

  const phone = single(fields, 'phone');
  if (!phone || phone.length > MAX_PHONE_CHARS) {
    fieldFail('phone', 'This field is required.');
  }

  const publicCredit = single(fields, 'public_credit');
  if (publicCredit !== 'legal_name' && publicCredit !== 'pen_name') {
    fieldFail('public_credit', 'This field is required.');
  }
  if (publicCredit === 'pen_name' && !single(fields, 'pen_name')) {
    fieldFail('pen_name', 'Please provide a pen name.');
  }

  const typeOfWork = single(fields, 'type_of_work');
  if (!(workTypeOptions as readonly string[]).includes(typeOfWork)) {
    fieldFail('type_of_work', 'This field is required.');
  }
  if (typeOfWork === 'Other' && !single(fields, 'type_of_work_other')) {
    fieldFail('type_of_work_other', 'Please describe the type of work.');
  }

  const category = single(fields, 'competition_category');
  if (category !== 'Untranslated Discovery' && category !== 'General Reader Recovery') {
    fieldFail('competition_category', 'This field is required.');
  }

  const sourceAccessible = single(fields, 'source_accessible');
  if (
    sourceAccessible !== 'Yes' &&
    sourceAccessible !== 'No' &&
    sourceAccessible !== 'Access requires permission or payment' &&
    sourceAccessible !== 'I am not sure'
  ) {
    fieldFail('source_accessible', 'This field is required.');
  }

  const largerWork = single(fields, 'larger_work');
  if (largerWork !== 'Yes' && largerWork !== 'No' && largerWork !== 'I am not sure') {
    fieldFail('larger_work', 'This field is required.');
  }
  if (largerWork === 'Yes' && !single(fields, 'larger_work_explain')) {
    fieldFail('larger_work_explain', 'Please explain the relationship to the larger work.');
  }

  const englishAware = single(fields, 'english_translation_aware');
  if (englishAware !== 'Yes' && englishAware !== 'No' && englishAware !== 'I am not sure') {
    fieldFail('english_translation_aware', 'This field is required.');
  }
  if (englishAware === 'Yes' && !single(fields, 'known_english_translations')) {
    fieldFail(
      'known_english_translations',
      'Please describe the known English translation(s).',
    );
  }

  const englishEdition = single(fields, 'english_edition_us');
  if (englishEdition !== 'Yes' && englishEdition !== 'No' && englishEdition !== 'I am not sure') {
    fieldFail('english_edition_us', 'This field is required.');
  }

  const specialComponents = single(fields, 'special_components');
  if (
    specialComponents !== 'Yes' &&
    specialComponents !== 'No' &&
    specialComponents !== 'I am not sure'
  ) {
    fieldFail('special_components', 'This field is required.');
  }
  if (specialComponents === 'Yes' && !single(fields, 'special_components_explain')) {
    fieldFail('special_components_explain', 'Please explain the special components.');
  }

  const publicationLimitations = single(fields, 'publication_limitations');
  if (
    publicationLimitations !== 'Yes' &&
    publicationLimitations !== 'No' &&
    publicationLimitations !== 'I am not sure'
  ) {
    fieldFail('publication_limitations', 'This field is required.');
  }
  if (publicationLimitations === 'Yes' && !single(fields, 'publication_limitations_explain')) {
    fieldFail(
      'publication_limitations_explain',
      'Please explain the publication limitations.',
    );
  }

  const conflicts = single(fields, 'conflicts');
  if (conflicts !== 'Yes' && conflicts !== 'No') {
    fieldFail('conflicts', 'This field is required.');
  }
  if (conflicts === 'Yes' && !single(fields, 'conflicts_describe')) {
    fieldFail('conflicts_describe', 'Please describe the conflict or relationship.');
  }

  const outsideAssistance = single(fields, 'outside_assistance');
  if (outsideAssistance !== 'Yes' && outsideAssistance !== 'No') {
    fieldFail('outside_assistance', 'This field is required.');
  }
  if (outsideAssistance === 'Yes' && !single(fields, 'outside_assistance_describe')) {
    fieldFail(
      'outside_assistance_describe',
      'Please describe the outside assistance provided.',
    );
  }

  for (const key of HIDDEN_WORKS_AGREEMENTS) {
    if (single(fields, key) !== 'yes') {
      fieldFail(key, 'You must accept this agreement to continue.');
    }
  }

  const wordCountRaw = single(fields, 'word_count');
  if (!/^\d+$/.test(wordCountRaw)) {
    fieldFail('word_count', 'Enter a whole number greater than zero.');
  }
  const wordCount = Number(wordCountRaw);
  if (!Number.isInteger(wordCount) || wordCount <= 0) {
    fieldFail('word_count', 'Enter a whole number greater than zero.');
  }

  const pageCountRaw = single(fields, 'page_count');
  if (pageCountRaw) {
    if (!/^\d+$/.test(pageCountRaw)) {
      fieldFail('page_count', 'Enter a whole number of zero or greater.');
    }
    const pageCount = Number(pageCountRaw);
    if (!Number.isInteger(pageCount) || pageCount < 0) {
      fieldFail('page_count', 'Enter a whole number of zero or greater.');
    }
  }

  const readerCase = single(fields, 'reader_facing_case');
  const readerWords = countWhitespaceSeparatedWords(readerCase);
  if (readerWords < 500) {
    fieldFail(
      'reader_facing_case',
      'The Reader-Facing Case must be at least 500 words.',
    );
  }
  if (readerWords > 1000) {
    fieldFail(
      'reader_facing_case',
      'The Reader-Facing Case must be at most 1,000 words.',
    );
  }

  requireHttpUrl(single(fields, 'primary_bibliographic_source'), 'primary_bibliographic_source', true);
  for (const key of [
    'additional_supporting_source',
    'source_url',
    'public_domain_source',
    'public_domain_edition',
  ] as const) {
    requireHttpUrl(single(fields, key), key, false);
  }

  const additionalLinks = allValues(fields, 'additional_links').filter(Boolean);
  for (const link of additionalLinks) {
    if (!isHttpOrHttpsUrl(link)) {
      fieldFail('additional_links', 'Enter a valid http or https URL.');
    }
  }

  let teamMembers: TeamMemberPayload[];
  let participantEmails: string[];
  ({ teamMembers, participantEmails } = normalizeTeamMembers(fields, email));

  const firstName = single(fields, 'legal_first_name');
  const middleName = single(fields, 'legal_middle_name');
  const lastName = single(fields, 'legal_last_name');
  const legalName = [firstName, middleName, lastName]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (key.startsWith('team_') || /^team_age_\d+$/.test(key)) continue;
    if (key === 'additional_links') continue;
    if (key === 'email') {
      payload.email = email;
      continue;
    }
    payload[key] = value;
  }

  payload.email = email;
  payload.submission_date = chicagoCalendarDate(now);
  payload.word_count = String(wordCount);
  if (pageCountRaw) payload.page_count = pageCountRaw;
  if (additionalLinks.length === 1) {
    payload.additional_links = additionalLinks;
  } else if (additionalLinks.length > 1) {
    payload.additional_links = additionalLinks;
  }
  if (entryType === 'Team') {
    payload.team_members = teamMembers;
  }
  payload.participant_emails = participantEmails;

  return {
    payload,
    payloadJson: JSON.stringify(payload),
    legalName,
    email,
    idempotencyKey,
    participantEmails,
  };
}

function validateHiddenWorksUploadedFile(file: File, spec: AllowedFileSpec): ValidatedUpload {
  if (file.size <= 0) {
    fieldFail(spec.fieldName, 'The selected file is empty. Choose a valid file.');
  }
  if (file.size > spec.maxBytes) {
    fieldFail(spec.fieldName, 'Each uploaded file must be 10 MB or smaller.');
  }
  try {
    return validateUploadedFile(file, spec);
  } catch (error) {
    if (error instanceof ValidationError) {
      fieldFail(spec.fieldName, 'This file type is not supported.');
    }
    throw error;
  }
}

export function validateHiddenWorksFiles(formData: FormData): ValidatedUpload[] {
  const uploads: ValidatedUpload[] = [];
  let totalBytes = 0;

  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') continue;
    if (!(value instanceof File) || !FILE_FIELD_SPECS[key]) {
      fieldFail(
        '__form__',
        'The submission contains an unexpected file field. Please refresh the page and try again.',
      );
    }
  }

  for (const [fieldName, spec] of Object.entries(FILE_FIELD_SPECS)) {
    const entries = formData.getAll(fieldName).filter((item): item is File => item instanceof File);
    const selected = entries.filter((file) => file.size > 0 || Boolean(file.name));

    if (fieldName === 'supporting_rights_documentation') {
      const nonempty = selected.filter((file) => file.size > 0);
      if (nonempty.length > 1) {
        fieldFail(
          'supporting_rights_documentation',
          'Upload only one supporting rights document.',
        );
      }
    }

    for (const file of selected) {
      const validated = validateHiddenWorksUploadedFile(file, spec);
      totalBytes += validated.sizeBytes;
      uploads.push(validated);
    }
  }

  if (uploads.length > HIDDEN_WORKS_MAX_FILE_COUNT) {
    fieldFail('__form__', 'You may upload no more than 20 supporting files.');
  }
  if (totalBytes > HIDDEN_WORKS_MAX_TOTAL_FILE_BYTES) {
    fieldFail('__form__', 'Supporting files may not exceed 40 MB in total.');
  }

  return uploads;
}

export function hiddenWorksValidationErrorResponse(error: unknown): Response {
  if (error instanceof TextTooLargeError) {
    return jsonResponse(413, { success: false, error: 'submission_too_large' });
  }
  if (error instanceof FieldValidationError) {
    return jsonResponse(400, {
      success: false,
      error: 'invalid_submission',
      field: error.field,
      message: error.publicMessage,
    });
  }
  if (error instanceof ValidationError) {
    return jsonResponse(400, { success: false, error: 'invalid_submission' });
  }
  return jsonResponse(500, { success: false, error: 'submission_failed' });
}

export type ExistingHiddenWorksRow = {
  email: string | null;
  payload_json: string | null;
};

/** Extract participant emails from an existing Hidden Works row without logging. */
export function participantEmailsFromExistingRow(row: ExistingHiddenWorksRow): string[] {
  if (row.payload_json) {
    try {
      const parsed = JSON.parse(row.payload_json) as { participant_emails?: unknown };
      if (Array.isArray(parsed.participant_emails)) {
        return parsed.participant_emails
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean);
      }
    } catch {
      // Fall through to top-level email.
    }
  }
  const fallback = (row.email ?? '').trim().toLowerCase();
  return fallback ? [fallback] : [];
}

export function hasReachedEntryLimit(
  newParticipantEmails: string[],
  existingRows: ExistingHiddenWorksRow[],
  limit: number = HIDDEN_WORKS_ENTRY_LIMIT,
): boolean {
  const counts = new Map<string, number>();
  for (const row of existingRows) {
    const emails = new Set(participantEmailsFromExistingRow(row));
    for (const email of emails) {
      counts.set(email, (counts.get(email) ?? 0) + 1);
    }
  }
  for (const email of newParticipantEmails) {
    if ((counts.get(email) ?? 0) >= limit) return true;
  }
  return false;
}

async function rollbackSubmission(
  env: Env,
  submissionId: string,
  uploadedKeys: string[],
): Promise<void> {
  for (const key of uploadedKeys) {
    try {
      await env.SUBMISSION_FILES.delete(key);
    } catch {
      // Best-effort cleanup.
    }
  }
  try {
    await env.SUBMISSIONS_DB.prepare('DELETE FROM submissions WHERE id = ?')
      .bind(submissionId)
      .run();
  } catch {
    // Best-effort cleanup.
  }
}

async function persistFiles(
  env: Env,
  submissionId: string,
  uploads: ValidatedUpload[],
): Promise<void> {
  const uploadedKeys: string[] = [];
  try {
    for (const upload of uploads) {
      const fileId = newEntityId();
      const objectKey = buildHiddenWorksObjectKey(
        submissionId,
        upload.fieldName,
        fileId,
        upload.validatedExtension,
      );
      await env.SUBMISSION_FILES.put(objectKey, upload.file.stream(), {
        httpMetadata: { contentType: upload.contentType },
      });
      uploadedKeys.push(objectKey);

      await env.SUBMISSIONS_DB.prepare(
        `INSERT INTO submission_files (
          id, submission_id, field_name, original_filename, object_key, content_type, size_bytes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          fileId,
          submissionId,
          upload.fieldName,
          upload.originalFilename,
          objectKey,
          upload.contentType,
          upload.sizeBytes,
        )
        .run();
    }
  } catch {
    await rollbackSubmission(env, submissionId, uploadedKeys);
    throw new Error('file_persist_failed');
  }
}

export type HandleHiddenWorksOptions = {
  now?: Date;
};

export async function handleHiddenWorksSubmit(
  request: Request,
  env: Env,
  options: HandleHiddenWorksOptions = {},
): Promise<Response> {
  const now = options.now ?? new Date();

  if (request.method !== 'POST') {
    return methodNotAllowed('POST');
  }

  if (!requireSameOrigin(request)) {
    return jsonResponse(403, { success: false, error: 'verification_failed' });
  }

  if (!isMultipartFormData(request.headers.get('Content-Type'))) {
    return jsonResponse(400, { success: false, error: 'invalid_submission' });
  }

  if (
    contentLengthTooLarge(
      request.headers.get('Content-Length'),
      HIDDEN_WORKS_MAX_REQUEST_BYTES,
    )
  ) {
    return jsonResponse(413, { success: false, error: 'submission_too_large' });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse(400, { success: false, error: 'invalid_submission' });
  }

  const turnstileToken = String(formData.get('cf-turnstile-response') ?? '').trim();
  if (!turnstileToken) {
    return jsonResponse(403, { success: false, error: 'verification_failed' });
  }

  const hostname = new URL(request.url).hostname;
  const remoteIp = request.headers.get('CF-Connecting-IP');
  let turnstileOk = false;
  try {
    turnstileOk = await verifyTurnstileToken(
      turnstileToken,
      env.TURNSTILE_SECRET_KEY,
      remoteIp,
      HIDDEN_WORKS_TURNSTILE_ACTION,
      hostname,
    );
  } catch {
    return jsonResponse(403, { success: false, error: 'verification_failed' });
  }
  if (!turnstileOk) {
    return jsonResponse(403, { success: false, error: 'verification_failed' });
  }

  const idempotencyRaw = formData.get('submission_idempotency_key');
  const idempotencyKey =
    typeof idempotencyRaw === 'string' ? idempotencyRaw.trim() : '';
  if (!idempotencyKey) {
    return jsonResponse(400, { success: false, error: 'invalid_submission' });
  }

  try {
    const existing = await env.SUBMISSIONS_DB.prepare(
      `SELECT id FROM submissions
       WHERE idempotency_key = ? AND form_type = ?
       LIMIT 1`,
    )
      .bind(idempotencyKey, HIDDEN_WORKS_FORM_TYPE)
      .first<{ id: string }>();

    if (existing?.id) {
      const replay = existingHiddenWorksSubmissionResponse(existing.id);
      return jsonResponse(replay.status, replay.body);
    }
  } catch {
    return jsonResponse(500, { success: false, error: 'submission_failed' });
  }

  let validated: HiddenWorksValidated;
  let uploads: ValidatedUpload[];
  try {
    const { fields } = collectHiddenWorksTextFields(formData);
    validated = validateHiddenWorksTextFields(fields, idempotencyKey, now);
    uploads = validateHiddenWorksFiles(formData);
  } catch (error) {
    return hiddenWorksValidationErrorResponse(error);
  }

  if (isHiddenWorksContestClosed(now)) {
    return jsonResponse(409, { success: false, error: 'contest_closed' });
  }

  try {
    const eligible = await env.SUBMISSIONS_DB.prepare(
      `SELECT COUNT(DISTINCT se.submission_id) AS cnt
       FROM submission_events se
       INNER JOIN submissions s ON s.id = se.submission_id
       WHERE s.form_type = ? AND se.event_type = 'eligible'`,
    )
      .bind(HIDDEN_WORKS_FORM_TYPE)
      .first<{ cnt: number }>();

    if (isEligibleCapReached(Number(eligible?.cnt ?? 0))) {
      return jsonResponse(409, { success: false, error: 'contest_closed' });
    }
  } catch {
    return jsonResponse(500, { success: false, error: 'submission_failed' });
  }

  try {
    const existingRows = await env.SUBMISSIONS_DB.prepare(
      `SELECT email, payload_json FROM submissions WHERE form_type = ?`,
    )
      .bind(HIDDEN_WORKS_FORM_TYPE)
      .all<ExistingHiddenWorksRow>();

    if (hasReachedEntryLimit(validated.participantEmails, existingRows.results ?? [])) {
      return jsonResponse(409, { success: false, error: 'entry_limit_reached' });
    }
  } catch {
    return jsonResponse(500, { success: false, error: 'submission_failed' });
  }

  const submissionId = newHiddenWorksSubmissionId();

  try {
    await env.SUBMISSIONS_DB.batch([
      env.SUBMISSIONS_DB.prepare(
        `INSERT INTO submissions (
          id, form_type, status, legal_name, email, payload_json, idempotency_key, agreement_version
        ) VALUES (?, ?, 'received', ?, ?, ?, ?, ?)`,
      ).bind(
        submissionId,
        HIDDEN_WORKS_FORM_TYPE,
        validated.legalName,
        validated.email,
        validated.payloadJson,
        validated.idempotencyKey,
        HIDDEN_WORKS_AGREEMENT_VERSION,
      ),
      env.SUBMISSIONS_DB.prepare(HIDDEN_WORKS_RECEIVED_EVENT_SQL).bind(submissionId),
    ]);
  } catch {
    return jsonResponse(500, { success: false, error: 'submission_failed' });
  }

  try {
    await persistFiles(env, submissionId, uploads);
  } catch {
    return jsonResponse(500, { success: false, error: 'submission_failed' });
  }

  const created = newHiddenWorksSubmissionResponse(submissionId);
  return jsonResponse(created.status, created.body);
}

// Re-export for tests that assert filename sanitization utilities stay shared.
export { sanitizeOriginalFilename };
