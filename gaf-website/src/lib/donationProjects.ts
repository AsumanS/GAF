/**
 * Supported donation project designations for Stripe metadata.
 * Identifiers come from src/data/projects.ts — do not invent new IDs here.
 */
import { projects, type Project } from '../data/projects';

/** Undesignated gifts from the main Donate page. */
export const GENERAL_DONATION_PROJECT = 'general';

/** Metadata key written to Stripe Checkout / PaymentIntent / Subscription. */
export const DONATION_PROJECT_METADATA_KEY = 'project';

export type DonationProjectOption = {
  id: string;
  label: string;
};

const PROJECT_IDS = new Set<string>([
  GENERAL_DONATION_PROJECT,
  ...projects.map((project) => project.id),
]);

function shortProjectLabel(project: Project): string {
  if (project.id === 'hidden-works') return 'Hidden Works';
  if (project.id === 'worlds-imagined') return 'Worlds Imagined';
  const beforeColon = project.title.split(':')[0]?.trim();
  return beforeColon || project.title;
}

/** Stable project ids accepted for donation attribution. */
export function supportedDonationProjectIds(): readonly string[] {
  return [GENERAL_DONATION_PROJECT, ...projects.map((project) => project.id)];
}

/** Options shown on the Donate form project selector. */
export function donationProjectOptions(): DonationProjectOption[] {
  return [
    { id: GENERAL_DONATION_PROJECT, label: 'General support' },
    ...projects.map((project) => ({
      id: project.id,
      label: shortProjectLabel(project),
    })),
  ];
}

export function isSupportedDonationProjectId(value: string): boolean {
  return PROJECT_IDS.has(value);
}

/**
 * Resolve a client- or URL-supplied project value.
 * Unsupported / missing values become `general` (never trust arbitrary IDs).
 */
export function resolveDonationProjectId(raw: unknown): string {
  if (typeof raw !== 'string') {
    return GENERAL_DONATION_PROJECT;
  }
  const trimmed = raw.trim();
  if (!trimmed || !isSupportedDonationProjectId(trimmed)) {
    return GENERAL_DONATION_PROJECT;
  }
  return trimmed;
}

/** Build `/donate` query preserving a non-general project designation. */
export function buildDonatePathWithProject(
  projectId: string,
  extra?: Record<string, string>,
): string {
  const params = new URLSearchParams();
  const resolved = resolveDonationProjectId(projectId);
  if (resolved !== GENERAL_DONATION_PROJECT) {
    params.set('project', resolved);
  }
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `/donate?${qs}` : '/donate';
}
