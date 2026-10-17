/**
 * Worker-side allowlist for donation project metadata.
 * Must stay aligned with src/lib/donationProjects.ts + src/data/projects.ts.
 */
export const GENERAL_DONATION_PROJECT = 'general';
export const DONATION_PROJECT_METADATA_KEY = 'project';

/** Stable ids from src/data/projects.ts — keep in sync when projects change. */
const SUPPORTED_DONATION_PROJECT_IDS = new Set<string>([
  GENERAL_DONATION_PROJECT,
  'hidden-works',
  'worlds-imagined',
]);

export function supportedDonationProjectIds(): readonly string[] {
  return [...SUPPORTED_DONATION_PROJECT_IDS];
}

export function resolveDonationProjectId(raw: unknown): string {
  if (typeof raw !== 'string') {
    return GENERAL_DONATION_PROJECT;
  }
  const trimmed = raw.trim();
  if (!trimmed || !SUPPORTED_DONATION_PROJECT_IDS.has(trimmed)) {
    return GENERAL_DONATION_PROJECT;
  }
  return trimmed;
}
