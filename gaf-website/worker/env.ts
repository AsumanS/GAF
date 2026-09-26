export interface Env {
  ASSETS: Fetcher;
  SUBMISSIONS_DB: D1Database;
  SUBMISSION_FILES: R2Bucket;
  TURNSTILE_SECRET_KEY: string;
  GMAIL_CLIENT_ID: string;
  GMAIL_CLIENT_SECRET: string;
  GMAIL_REFRESH_TOKEN: string;
  SUBMISSION_FILE_LINK_SECRET: string;
}
