/** Lightweight request stage timing. Never logs PII, payloads, or secrets. */

export const STAGE_SLOW_MS = 5_000;
export const TOTAL_SLOW_MS = 15_000;

export type RequestTimerOptions = {
  stageSlowMs?: number;
  totalSlowMs?: number;
  now?: () => number;
  warn?: (line: string) => void;
};

export type RequestTimer = {
  setSubmissionId: (id: string) => void;
  /** Record elapsed time for a stage that started at `stageStartedAt` (ms). */
  recordStage: (stage: string, stageStartedAt: number) => number;
  /** Record total elapsed time since timer creation. Call when the HTTP response is ready. */
  finishTotal: () => number;
};

export function createRequestTimer(
  formType: string,
  request: Request,
  options: RequestTimerOptions = {},
): RequestTimer {
  const now = options.now ?? Date.now;
  const stageSlowMs = options.stageSlowMs ?? STAGE_SLOW_MS;
  const totalSlowMs = options.totalSlowMs ?? TOTAL_SLOW_MS;
  const warn = options.warn ?? ((line: string) => console.warn(line));
  const startedAt = now();
  let submissionId: string | undefined;
  let cfRay = '';
  try {
    cfRay = request.headers.get('CF-Ray') ?? '';
  } catch {
    cfRay = '';
  }

  function emit(stage: string, durationMs: number): void {
    const payload: Record<string, string | number> = {
      marker: 'slow_request',
      form_type: formType,
      stage,
      duration_ms: durationMs,
    };
    if (submissionId) payload.submission_id = submissionId;
    if (cfRay) payload.cf_ray = cfRay;
    try {
      warn(JSON.stringify(payload));
    } catch {
      // Never throw from timing diagnostics.
    }
  }

  return {
    setSubmissionId(id: string) {
      submissionId = id;
    },
    recordStage(stage: string, stageStartedAt: number) {
      const durationMs = Math.max(0, now() - stageStartedAt);
      if (durationMs > stageSlowMs) emit(stage, durationMs);
      return durationMs;
    },
    finishTotal() {
      const durationMs = Math.max(0, now() - startedAt);
      if (durationMs > totalSlowMs) emit('total_request', durationMs);
      return durationMs;
    },
  };
}
