import type { Env } from '../env';
import { internalFailureResponse, scheduleInternalErrorReport } from '../errorNotification';
import { createRequestTimer } from '../requestTiming';
import { scheduleSubmissionNotification } from '../submissionEmail';
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
  jsonResponse,
  methodNotAllowed,
  newEntityId,
  newSubmissionId,
  newVolunteerSubmissionResponse,
  requireSameOrigin,
  validateVolunteerFiles,
  validateVolunteerTextFields,
  verifyTurnstileToken,
  type ValidatedUpload,
} from './common';

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
      const objectKey = buildVolunteerObjectKey(submissionId, fileId, upload.validatedExtension);

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
  } catch (error) {
    await rollbackSubmission(env, submissionId, uploadedKeys);
    throw new Error('file_persist_failed', { cause: error });
  }

  return uploadedKeys;
}

export async function handleVolunteerSubmit(
  request: Request,
  env: Env,
  ctx?: ExecutionContext,
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

  const timer = createRequestTimer('volunteer', request);
  try {
    let formData: FormData;
    let stageStarted = Date.now();
    try {
      formData = await request.formData();
      timer.recordStage('formdata_parse', stageStarted);
    } catch {
      timer.recordStage('formdata_parse', stageStarted);
      return jsonResponse(400, { success: false, error: 'invalid_submission' });
    }

    const turnstileToken = String(formData.get('cf-turnstile-response') ?? '').trim();
    if (!turnstileToken) {
      return jsonResponse(403, { success: false, error: 'verification_failed' });
    }

    const hostname = new URL(request.url).hostname;
    const remoteIp = request.headers.get('CF-Connecting-IP');
    let turnstileOk = false;
    stageStarted = Date.now();
    try {
      turnstileOk = await verifyTurnstileToken(
        turnstileToken,
        env.TURNSTILE_SECRET_KEY,
        remoteIp,
        VOLUNTEER_TURNSTILE_ACTION,
        hostname,
      );
    } catch (error) {
      timer.recordStage('turnstile_verify', stageStarted);
      scheduleInternalErrorReport(ctx, env, {
        formType: 'volunteer',
        stage: 'turnstile_verify',
        request,
        error,
      });
      return jsonResponse(403, { success: false, error: 'verification_failed' });
    }
    timer.recordStage('turnstile_verify', stageStarted);
    if (!turnstileOk) {
      return jsonResponse(403, { success: false, error: 'verification_failed' });
    }

    let validated;
    let uploads: ValidatedUpload[];
    stageStarted = Date.now();
    try {
      const { fields } = collectTextFields(formData);
      const idempotencyRaw = formData.get('submission_idempotency_key');
      validated = validateVolunteerTextFields(
        fields,
        typeof idempotencyRaw === 'string' ? idempotencyRaw : null,
      );
      uploads = validateVolunteerFiles(formData);
      timer.recordStage('validation', stageStarted);
    } catch (error) {
      timer.recordStage('validation', stageStarted);
      if (error instanceof TextTooLargeError) {
        return jsonResponse(413, { success: false, error: 'submission_too_large' });
      }
      if (error instanceof ValidationError) {
        return jsonResponse(400, { success: false, error: 'invalid_submission' });
      }
      return jsonResponse(400, { success: false, error: 'invalid_submission' });
    }

    stageStarted = Date.now();
    try {
      const existing = await env.SUBMISSIONS_DB.prepare(
        `SELECT id FROM submissions
       WHERE idempotency_key = ? AND form_type = 'volunteer'
       LIMIT 1`,
      )
        .bind(validated.idempotencyKey)
        .first<{ id: string }>();

      timer.recordStage('idempotency_lookup', stageStarted);
      if (existing?.id) {
        const replay = existingVolunteerSubmissionResponse(existing.id);
        return jsonResponse(replay.status, replay.body);
      }
    } catch (error) {
      timer.recordStage('idempotency_lookup', stageStarted);
      return internalFailureResponse(ctx, env, request, 'volunteer', 'idempotency_lookup', error);
    }

    const submissionId = newSubmissionId();
    timer.setSubmissionId(submissionId);

    stageStarted = Date.now();
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
      timer.recordStage('submission_persist', stageStarted);
    } catch (error) {
      timer.recordStage('submission_persist', stageStarted);
      return internalFailureResponse(
        ctx,
        env,
        request,
        'volunteer',
        'submission_persist',
        error,
        submissionId,
      );
    }

    stageStarted = Date.now();
    try {
      await persistFiles(env, submissionId, uploads);
      timer.recordStage('file_persist', stageStarted);
    } catch (error) {
      timer.recordStage('file_persist', stageStarted);
      return internalFailureResponse(
        ctx,
        env,
        request,
        'volunteer',
        'file_persist',
        error,
        submissionId,
      );
    }

    // total_request stops here — Gmail notification is waitUntil background work.
    scheduleSubmissionNotification(ctx, env, submissionId, 'volunteer');

    const created = newVolunteerSubmissionResponse(submissionId);
    return jsonResponse(created.status, created.body);
  } finally {
    timer.finishTotal();
  }
}
