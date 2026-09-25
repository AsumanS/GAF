/** Shared helpers for form submission API routes. No PII logging. */

export const MAX_REQUEST_BYTES = 22 * 1024 * 1024;
export const MAX_TOTAL_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_SINGLE_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_STRING_CHARS = 100_000;
export const MAX_TOTAL_TEXT_BYTES = 1 * 1024 * 1024;
export const MAX_PHONE_CHARS = 100;
export const MAX_FILENAME_CHARS = 255;

export const VOLUNTEER_AGREEMENT_VERSION = 'volunteer-2026-09-25-v1';
export const VOLUNTEER_TURNSTILE_ACTION = 'volunteer_submit';

export const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
} as const;

export type ApiErrorCode =
  | 'invalid_submission'
  | 'verification_failed'
  | 'submission_too_large'
  | 'submission_failed';

export type ApiSuccessBody = {
  success: true;
  submission_id: string;
  duplicate: boolean;
};

export type ApiErrorBody = {
  success: false;
  error: ApiErrorCode;
};

export function jsonResponse(
  status: number,
  body: ApiSuccessBody | ApiErrorBody,
  extraHeaders?: HeadersInit,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...extraHeaders,
    },
  });
}

export function methodNotAllowed(allow: string): Response {
  return jsonResponse(
    405,
    { success: false, error: 'invalid_submission' },
    { Allow: allow },
  );
}

/** Basic syntactic email check (non-empty, has @ and a domain label). */
export function isValidEmail(value: string): boolean {
  if (!value || value.length > MAX_STRING_CHARS) return false;
  // Intentionally simple; reject spaces and require local@domain.tld shape.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function sanitizeOriginalFilename(name: string): string {
  const segments = name.split(/[/\\]/);
  let cleaned = segments[segments.length - 1] ?? name;
  cleaned = cleaned.replace(/[\u0000-\u001f\u007f]/g, '');
  cleaned = cleaned.trim();
  if (!cleaned) cleaned = 'file';
  if (cleaned.length > MAX_FILENAME_CHARS) {
    cleaned = cleaned.slice(0, MAX_FILENAME_CHARS);
  }
  return cleaned;
}

export function extensionForMime(contentType: string, originalName: string): string | null {
  const lowerType = contentType.toLowerCase().split(';')[0]?.trim() ?? '';
  const fromName = originalName.includes('.')
    ? originalName.slice(originalName.lastIndexOf('.') + 1).toLowerCase()
    : '';

  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'image/jpeg': 'jpg',
    'image/png': 'png',
  };

  if (lowerType in map) return map[lowerType];

  const extMap: Record<string, string> = {
    pdf: 'pdf',
    doc: 'doc',
    docx: 'docx',
    jpg: 'jpg',
    jpeg: 'jpg',
    png: 'png',
  };
  if (fromName in extMap) return extMap[fromName];
  return null;
}

export function buildVolunteerObjectKey(
  submissionId: string,
  fileUuid: string,
  validatedExtension: string,
): string {
  return `volunteer/${submissionId}/${fileUuid}.${validatedExtension}`;
}

export type TurnstileSiteverifyResult = {
  success?: boolean;
  action?: string;
  hostname?: string;
  'error-codes'?: string[];
};

export function isTurnstileAccepted(
  result: TurnstileSiteverifyResult,
  expectedAction: string,
  expectedHostname: string,
): boolean {
  return (
    result.success === true &&
    result.action === expectedAction &&
    result.hostname === expectedHostname
  );
}

const PAYLOAD_EXCLUDED = new Set(['cf-turnstile-response', 'submission_idempotency_key']);

export type ParsedFormText = {
  fields: Record<string, string | string[]>;
  totalTextBytes: number;
};

/**
 * Collect non-file fields from FormData into a payload-friendly record.
 * Repeated keys become arrays. Values are trimmed.
 */
export function collectTextFields(formData: FormData): ParsedFormText {
  const collected: Record<string, string[]> = {};
  let totalTextBytes = 0;

  for (const [key, value] of formData.entries()) {
    if (typeof value !== 'string') continue;
    if (PAYLOAD_EXCLUDED.has(key)) continue;

    if (value.length > MAX_STRING_CHARS) {
      throw new ValidationError();
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

export function buildPayloadJson(fields: Record<string, string | string[]>): string {
  return JSON.stringify(fields);
}

export class TextTooLargeError extends Error {
  constructor() {
    super('text_too_large');
    this.name = 'TextTooLargeError';
  }
}

export class ValidationError extends Error {
  constructor() {
    super('invalid_submission');
    this.name = 'ValidationError';
  }
}

export const VOLUNTEER_REQUIRED_STRINGS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'city',
  'state_region',
  'country',
  'time_zone',
  'why_volunteer',
  'how_contribute',
  'skills_experience',
  'available_start_date',
  'time_commitment',
  'volunteer_duration',
  'reference_1_name',
  'reference_1_relationship',
  'reference_1_email',
  'reference_1_phone',
  'reference_2_name',
  'reference_2_relationship',
  'reference_2_email',
  'reference_2_phone',
  'background_check_willing',
] as const;

export const VOLUNTEER_EMAIL_FIELDS = [
  'email',
  'reference_1_email',
  'reference_2_email',
] as const;

export const VOLUNTEER_PHONE_FIELDS = [
  'phone',
  'reference_1_phone',
  'reference_2_phone',
] as const;

export const VOLUNTEER_DECLARATIONS = [
  'declare_references_contact',
  'declare_accuracy',
  'declare_no_guarantee',
  'declare_unpaid',
  'declare_confidentiality',
] as const;

export type VolunteerValidated = {
  fields: Record<string, string | string[]>;
  payloadJson: string;
  legalName: string;
  email: string;
  idempotencyKey: string;
};

function single(fields: Record<string, string | string[]>, key: string): string {
  const value = fields[key];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function allValues(fields: Record<string, string | string[]>, key: string): string[] {
  const value = fields[key];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function validateVolunteerTextFields(
  fields: Record<string, string | string[]>,
  idempotencyKeyRaw: string | null,
): VolunteerValidated {
  const idempotencyKey = (idempotencyKeyRaw ?? '').trim();
  if (!idempotencyKey) throw new ValidationError();

  for (const key of VOLUNTEER_REQUIRED_STRINGS) {
    if (!single(fields, key)) throw new ValidationError();
  }

  if (single(fields, 'age_18_or_older') !== 'Yes') throw new ValidationError();

  const availability = allValues(fields, 'preferred_availability').filter(Boolean);
  if (availability.length === 0) throw new ValidationError();
  fields.preferred_availability = availability;

  for (const key of VOLUNTEER_DECLARATIONS) {
    if (single(fields, key) !== 'yes') throw new ValidationError();
  }

  for (const key of VOLUNTEER_EMAIL_FIELDS) {
    const email = single(fields, key).toLowerCase();
    if (!isValidEmail(email)) throw new ValidationError();
    fields[key] = email;
  }

  for (const key of VOLUNTEER_PHONE_FIELDS) {
    const phone = single(fields, key);
    if (!phone || phone.length > MAX_PHONE_CHARS) throw new ValidationError();
  }

  const firstName = single(fields, 'first_name');
  const lastName = single(fields, 'last_name');
  const legalName = `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();
  const email = single(fields, 'email');

  return {
    fields,
    payloadJson: buildPayloadJson(fields),
    legalName,
    email,
    idempotencyKey,
  };
}

export type AllowedFileSpec = {
  fieldName: string;
  required: boolean;
  maxBytes: number;
  allowedMimeTypes: ReadonlySet<string>;
  allowedExtensions: ReadonlySet<string>;
};

export const RESUME_SPEC: AllowedFileSpec = {
  fieldName: 'resume',
  required: true,
  maxBytes: MAX_SINGLE_FILE_BYTES,
  allowedMimeTypes: new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
  allowedExtensions: new Set(['pdf', 'doc', 'docx']),
};

export const WORK_SAMPLE_SPEC: AllowedFileSpec = {
  fieldName: 'work_sample',
  required: false,
  maxBytes: MAX_SINGLE_FILE_BYTES,
  allowedMimeTypes: new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
  ]),
  allowedExtensions: new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']),
};

export type ValidatedUpload = {
  fieldName: string;
  file: File;
  contentType: string;
  validatedExtension: string;
  originalFilename: string;
  sizeBytes: number;
};

function normalizeMime(type: string): string {
  return type.toLowerCase().split(';')[0]?.trim() ?? '';
}

export function validateUploadedFile(file: File, spec: AllowedFileSpec): ValidatedUpload {
  if (file.size <= 0) throw new ValidationError();
  if (file.size > spec.maxBytes) throw new ValidationError();

  const originalFilename = sanitizeOriginalFilename(file.name || 'file');
  const mime = normalizeMime(file.type);
  const ext = extensionForMime(mime, originalFilename);
  if (!ext) throw new ValidationError();

  const extOk =
    spec.allowedExtensions.has(ext) ||
    (ext === 'jpg' && spec.allowedExtensions.has('jpeg'));
  const mimeOk =
    !mime ||
    spec.allowedMimeTypes.has(mime) ||
    (mime === 'image/jpg' && spec.allowedMimeTypes.has('image/jpeg'));

  // Require a known extension; if browser sent a type, it must be allowed.
  if (!extOk) throw new ValidationError();
  if (mime && !mimeOk) throw new ValidationError();

  const contentType =
    mime && mimeOk
      ? mime === 'image/jpg'
        ? 'image/jpeg'
        : mime
      : ext === 'pdf'
        ? 'application/pdf'
        : ext === 'doc'
          ? 'application/msword'
          : ext === 'docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : ext === 'png'
              ? 'image/png'
              : 'image/jpeg';

  const validatedExtension = ext === 'jpeg' ? 'jpg' : ext;

  return {
    fieldName: spec.fieldName,
    file,
    contentType,
    validatedExtension,
    originalFilename,
    sizeBytes: file.size,
  };
}

export function validateVolunteerFiles(formData: FormData): ValidatedUpload[] {
  const uploads: ValidatedUpload[] = [];
  let totalBytes = 0;

  const resumeEntry = formData.get('resume');
  if (!(resumeEntry instanceof File) || resumeEntry.size === 0) {
    throw new ValidationError();
  }
  const resume = validateUploadedFile(resumeEntry, RESUME_SPEC);
  totalBytes += resume.sizeBytes;
  uploads.push(resume);

  const workSampleEntry = formData.get('work_sample');
  if (workSampleEntry instanceof File && workSampleEntry.size > 0) {
    const workSample = validateUploadedFile(workSampleEntry, WORK_SAMPLE_SPEC);
    totalBytes += workSample.sizeBytes;
    uploads.push(workSample);
  }

  if (totalBytes > MAX_TOTAL_FILE_BYTES) throw new ValidationError();

  return uploads;
}

export function requireSameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}

export function isMultipartFormData(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().includes('multipart/form-data');
}

export function contentLengthTooLarge(contentLengthHeader: string | null): boolean {
  if (contentLengthHeader === null || contentLengthHeader === '') return false;
  const length = Number(contentLengthHeader);
  if (!Number.isFinite(length) || length < 0) return true;
  return length > MAX_REQUEST_BYTES;
}

export function existingVolunteerSubmissionResponse(submissionId: string): {
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

export function newVolunteerSubmissionResponse(submissionId: string): {
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

export function newSubmissionId(): string {
  return `VOL-${crypto.randomUUID()}`;
}

export function newEntityId(): string {
  return crypto.randomUUID();
}
