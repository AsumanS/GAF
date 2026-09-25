import type { Env } from '../env';
import {
  VOLUNTEER_AGREEMENT_VERSION,
  VOLUNTEER_TURNSTILE_ACTION,
  ValidationError,
  TextTooLargeError,
  buildVolunteerObjectKey,
  collectTextFields,
  contentLengthTooLarge,
  existingVolunteerSubmissionResponse,
  isMultipartFormData,
  isTurnstileAccepted,
  jsonResponse,
  methodNotAllowed,
  newEntityId,
  newSubmissionId,
  newVolunteerSubmissionResponse,
  requireSameOrigin,
  validateVolunteerFiles,
  validateVolunteerTextFields,
  type TurnstileSiteverifyResult,
  type ValidatedUpload,
} from './common';

async function verifyTurnstile(
  token: string,
  secret: string,
  remoteIp: string | null,
  expectedHostname: string,
): Promise<boolean> {
  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  if (remoteIp) {
    body.set('remoteip', remoteIp);
  }

  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      body,
    },
  );

  if (!response.ok) {
    return false;
  }

  const result = (await response.json()) as TurnstileSiteverifyResult;
  return isTurnstileAccepted(result, VOLUNTEER_TURNSTILE_ACTION, expectedHostname);
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
      // Best-effort cleanup; do not log object details.
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
): Promise<string[]> {
  const uploadedKeys: string[] = [];

  try {
    for (const upload of uploads) {
      const fileId = newEntityId();
      const objectKey = buildVolunteerObjectKey(
        submissionId,
        fileId,
        upload.validatedExtension,
      );

      await env.SUBMISSION_FILES.put(objectKey, upload.file.stream(), {
        httpMetadata: {
          contentType: upload.contentType,
        },
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

  return uploadedKeys;
}

export async function handleVolunteerSubmit(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'POST') {
    return methodNotAllowed('POST');
  }

  if (!requireSameOrigin(request)) {
    return jsonResponse(403, { success: false, error: 'verification_failed' });
  }

  const contentType = request.headers.get('Content-Type');
  if (!isMultipartFormData(contentType)) {
    return jsonResponse(400, { success: false, error: 'invalid_submission' });
  }

  if (contentLengthTooLarge(request.headers.get('Content-Length'))) {
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
    turnstileOk = await verifyTurnstile(
      turnstileToken,
      env.TURNSTILE_SECRET_KEY,
      remoteIp,
      hostname,
    );
  } catch {
    return jsonResponse(403, { success: false, error: 'verification_failed' });
  }
  if (!turnstileOk) {
    return jsonResponse(403, { success: false, error: 'verification_failed' });
  }

  let validated;
  let uploads: ValidatedUpload[];
  try {
    const { fields } = collectTextFields(formData);
    const idempotencyRaw = formData.get('submission_idempotency_key');
    validated = validateVolunteerTextFields(
      fields,
      typeof idempotencyRaw === 'string' ? idempotencyRaw : null,
    );
    uploads = validateVolunteerFiles(formData);
  } catch (error) {
    if (error instanceof TextTooLargeError) {
      return jsonResponse(413, { success: false, error: 'submission_too_large' });
    }
    if (error instanceof ValidationError) {
      return jsonResponse(400, { success: false, error: 'invalid_submission' });
    }
    return jsonResponse(400, { success: false, error: 'invalid_submission' });
  }

  try {
    const existing = await env.SUBMISSIONS_DB.prepare(
      `SELECT id FROM submissions
       WHERE idempotency_key = ? AND form_type = 'volunteer'
       LIMIT 1`,
    )
      .bind(validated.idempotencyKey)
      .first<{ id: string }>();

    if (existing?.id) {
      const replay = existingVolunteerSubmissionResponse(existing.id);
      return jsonResponse(replay.status, replay.body);
    }
  } catch {
    return jsonResponse(500, { success: false, error: 'submission_failed' });
  }

  const submissionId = newSubmissionId();

  try {
    await env.SUBMISSIONS_DB.batch([
      env.SUBMISSIONS_DB.prepare(
        `INSERT INTO submissions (
          id, form_type, status, legal_name, email, payload_json, idempotency_key, agreement_version
        ) VALUES (?, 'volunteer', 'received', ?, ?, ?, ?, ?)`,
      ).bind(
        submissionId,
        validated.legalName,
        validated.email,
        validated.payloadJson,
        validated.idempotencyKey,
        VOLUNTEER_AGREEMENT_VERSION,
      ),
      env.SUBMISSIONS_DB.prepare(
        `INSERT INTO submission_events (
          submission_id, event_type, actor, previous_status, new_status, metadata_json
        ) VALUES (?, 'received', 'system', NULL, 'received', NULL)`,
      ).bind(submissionId),
    ]);
  } catch {
    return jsonResponse(500, { success: false, error: 'submission_failed' });
  }

  try {
    await persistFiles(env, submissionId, uploads);
  } catch {
    return jsonResponse(500, { success: false, error: 'submission_failed' });
  }

  const created = newVolunteerSubmissionResponse(submissionId);
  return jsonResponse(created.status, created.body);
}
