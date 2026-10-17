import { describe, expect, it } from 'vitest';
import { projects } from '../src/data/projects';
import {
  GENERAL_DONATION_PROJECT,
  buildDonatePathWithProject,
  donationProjectOptions,
  resolveDonationProjectId,
  supportedDonationProjectIds,
} from '../src/lib/donationProjects';
import {
  resolveDonationProjectId as resolveWorkerDonationProjectId,
  supportedDonationProjectIds as workerSupportedDonationProjectIds,
} from '../worker/donationProjects';

describe('donation project identifiers', () => {
  it('includes general plus each project.id from the website catalog', () => {
    expect(supportedDonationProjectIds()).toEqual([
      'general',
      ...projects.map((project) => project.id),
    ]);
    expect(supportedDonationProjectIds()).toContain('hidden-works');
    expect(supportedDonationProjectIds()).toContain('worlds-imagined');
  });

  it('keeps worker and frontend allowlists aligned', () => {
    expect([...workerSupportedDonationProjectIds()].sort()).toEqual(
      [...supportedDonationProjectIds()].sort(),
    );
  });

  it('defaults missing or invalid values to general', () => {
    expect(resolveDonationProjectId(undefined)).toBe(GENERAL_DONATION_PROJECT);
    expect(resolveDonationProjectId(null)).toBe(GENERAL_DONATION_PROJECT);
    expect(resolveDonationProjectId('')).toBe(GENERAL_DONATION_PROJECT);
    expect(resolveDonationProjectId('evil')).toBe(GENERAL_DONATION_PROJECT);
    expect(resolveDonationProjectId('worlds')).toBe(GENERAL_DONATION_PROJECT); // slug ≠ id
    expect(resolveDonationProjectId('../hidden-works')).toBe(GENERAL_DONATION_PROJECT);
    expect(resolveWorkerDonationProjectId('not-a-project')).toBe('general');
  });

  it('accepts each supported project id', () => {
    for (const id of supportedDonationProjectIds()) {
      expect(resolveDonationProjectId(id)).toBe(id);
      expect(resolveWorkerDonationProjectId(id)).toBe(id);
    }
  });

  it('builds project donate paths from stable project ids', () => {
    expect(buildDonatePathWithProject('general')).toBe('/donate');
    expect(buildDonatePathWithProject('hidden-works')).toBe(
      '/donate?project=hidden-works',
    );
    expect(buildDonatePathWithProject('worlds-imagined')).toBe(
      '/donate?project=worlds-imagined',
    );
    expect(buildDonatePathWithProject('evil')).toBe('/donate');
  });

  it('exposes donate-form options for general and each project', () => {
    const options = donationProjectOptions();
    expect(options.map((option) => option.id)).toEqual(supportedDonationProjectIds());
    expect(options[0]).toEqual({ id: 'general', label: 'General support' });
    expect(options.find((option) => option.id === 'hidden-works')?.label).toBe(
      'Hidden Works',
    );
    expect(options.find((option) => option.id === 'worlds-imagined')?.label).toBe(
      'Worlds Imagined',
    );
  });
});
