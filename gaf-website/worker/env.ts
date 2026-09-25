export interface Env {
  ASSETS: Fetcher;
  SUBMISSIONS_DB: D1Database;
  SUBMISSION_FILES: R2Bucket;
  TURNSTILE_SECRET_KEY: string;
}
