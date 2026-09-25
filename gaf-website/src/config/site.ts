/**
 * Central configuration for Golden Archive Foundation.
 * Edit this file to supply organization facts as they become available.
 * Do not invent values. Leave unknown fields as empty strings, empty arrays, or null.
 *
 * Donation-related fields must remain disabled until legal and state-registration
 * review is complete. See COMPLIANCE.md.
 */

import type { FoundationNote, TrustFact, WorkItem } from '../types/content';

export type FundraisingStatus = 'registration-in-progress' | 'not-soliciting' | 'enabled';

export type SocialLinks = {
  bluesky?: string;
  facebook?: string;
  github?: string;
  instagram?: string;
  linkedin?: string;
  mastodon?: string;
  threads?: string;
  x?: string;
  youtube?: string;
};

export type SiteConfig = {
  /** Production site origin without trailing slash. Update before launch. */
  siteUrl: string;
  organizationName: string;
  shortName: string;
  legalStatus: string;
  foundationClassification: string;
  /** Employer Identification Number. Leave empty until confirmed for public display. */
  ein: string;
  publicEmail: string;
  mailingAddress: string;
  determinationLetterUrl: string;
  irsSearchUrl: string;
  formationDocumentUrl: string;
  bylawsUrl: string;
  conflictOfInterestPolicyUrl: string;
  form990Url: string;
  annualReportUrl: string;
  financialStatementsUrl: string;
  socialLinks: SocialLinks;
  /**
   * Master switch for any donation UI, links, or structured-data actions.
   * Must remain false until registration and disclosure requirements are met.
   */
  donationsEnabled: boolean;
  /**
   * Reserved for a future Zelle presentation path.
   * Must never be used to show payment details while donationsEnabled is false.
   * Do not store Zelle handles, bank numbers, or routing data in this repository.
   */
  zelleEnabled: boolean;
  fundraisingStatus: FundraisingStatus;
  approvedDonationJurisdictions: string[];
  donationDisclosure: string;
  /** Short public explanation of what donations support. Shown only when donationsEnabled. */
  donationSupportText: string;
  /** Tax-deductibility language for public donation pages. Leave empty until counsel supplies text. */
  donationTaxLanguage: string;
  /** Destination for the Donate button. Leave empty until a reviewed giving URL exists. */
  donationUrl: string;
  submissionsOpen: boolean;
  volunteerApplicationsOpen: boolean;
  /**
   * POST endpoint for the volunteer application form (multipart).
   * Leave empty until a reviewed form handler (e.g. Formspree) is configured.
   */
  volunteerFormAction: string;
  /** POST endpoint for the Hidden Works submission form (multipart). */
  hiddenWorksSubmitFormAction: string;
  defaultOgImage: string;
  tagline: string;
  description: string;
  /** ISO date (YYYY-MM-DD) of the last public content update. */
  lastSiteUpdate: string;
  /**
   * Optional signed foundation statement.
   * Leave statement empty to hide the homepage note entirely.
   */
  foundationNote: FoundationNote;
  /** Factual items currently underway. Empty entries are not shown. */
  currentWork: WorkItem[];
  /** Verified institutional facts safe for public display. */
  establishedFacts: TrustFact[];
  /** Honest list of work still underway or not yet available. */
  inDevelopmentFacts: TrustFact[];
};

export const site: SiteConfig = {
  siteUrl: '',
  organizationName: 'Golden Archive Foundation',
  shortName: 'Golden Archive',
  legalStatus: '501(c)(3) tax-exempt organization',
  foundationClassification: 'Public charity',
  ein: '',
  publicEmail: 'goldenarchivefoundation@gmail.com',
  mailingAddress: '',
  determinationLetterUrl: '/documents/transparency/IRS_Determination_Letter_Public_Copy.pdf',
  irsSearchUrl:
    '/documents/transparency/IRS_EO_BMF_Record_Golden_Archive_Foundation_Public_Copy.pdf',
  formationDocumentUrl: '/documents/transparency/Texas_Certificate_of_Formation_Public_Copy.pdf',
  bylawsUrl: '/documents/transparency/Bylaws_Public_Copy.pdf',
  conflictOfInterestPolicyUrl: '/documents/transparency/Conflict_of_Interest_Policy_Public_Copy.pdf',
  form990Url: '/documents/transparency/2025_Form_990EZ_Public_Copy.pdf',
  annualReportUrl: '/documents/transparency/Golden_Archive_Foundation_2025_Annual_Report.pdf',
  financialStatementsUrl:
    '/documents/transparency/Golden_Archive_Foundation_2025_Financial_Statements.pdf',
  socialLinks: {},
  donationsEnabled: false,
  zelleEnabled: false,
  fundraisingStatus: 'registration-in-progress',
  approvedDonationJurisdictions: [],
  donationDisclosure: '',
  donationSupportText: '',
  donationTaxLanguage: '',
  donationUrl: '/donate',
  submissionsOpen: false,
  volunteerApplicationsOpen: false,
  volunteerFormAction: '/api/forms/volunteer',
  hiddenWorksSubmitFormAction: '/api/forms/hidden-works',
  defaultOgImage: '/images/foundation/og-default.png',
  tagline: 'Stories from the Past. Service for the Future.',
  description:
    'Bringing ancient stories, cultural memory, and creative service to modern audiences.',
  lastSiteUpdate: '2026-07-24',
  foundationNote: {
    statement: '',
    name: '',
    role: '',
    date: '',
    photoSrc: '',
    photoAlt: '',
  },
  currentWork: [
    {
      id: 'website',
      title: 'Public website and content architecture',
      stage: 'in-progress',
      lastUpdated: '2026-07-24',
      explanation:
        'Building the public site, editorial structure, and configuration so foundation facts can be published without inventing missing details.',
    },
    {
      id: 'lost-stories-framework',
      title: 'Lost Stories eligibility and evidence framework',
      stage: 'in-progress',
      lastUpdated: '2026-07-17',
      explanation:
        'Drafting the discovery problem, evidence expectations, and unresolved eligibility questions before any submission period opens.',
    },
    {
      id: 'worlds-framework',
      title: 'Worlds Imagined research method notes',
      stage: 'in-progress',
      lastUpdated: '2026-07-17',
      explanation:
        'Defining source categories, reconstruction rules, and the distinction between historical evidence and modern illustration.',
    },
    {
      id: 'charitable-registration',
      title: 'State charitable-registration review',
      stage: 'in-progress',
      lastUpdated: '2026-07-17',
      explanation:
        'Completing the compliance and administrative work required before any public fundraising features can be enabled.',
    },
  ],
  establishedFacts: [
    {
      id: 'irs-status',
      label: 'IRS recognition as a Section 501(c)(3) tax-exempt organization',
    },
    {
      id: 'classification',
      label: 'Classified as a public charity',
    },
    {
      id: 'operations',
      label: 'Operational banking established for administrative use',
      detail:
        'Banking capacity is not an invitation to contribute. Online giving remains unavailable until registration and disclosure requirements are met.',
    },
    {
      id: 'projects-defined',
      label: 'Two primary project concepts defined: Lost Stories and Worlds Imagined',
    },
    {
      id: 'planning',
      label: 'Project planning and public-facing documentation underway',
    },
  ],
  inDevelopmentFacts: [
    { id: 'state-reg', label: 'State charitable solicitation registrations' },
    { id: 'donations', label: 'Public donation functionality on this website' },
    { id: 'submissions', label: 'Submission portal for Lost Stories' },
    { id: 'contest-rules', label: 'Official contest rules and eligibility finalization' },
    { id: 'jury', label: 'Jury and reviewer appointments' },
    { id: 'volunteer-apps', label: 'Formal volunteer application process' },
    { id: 'pub-schedule', label: 'Publication schedule for selected works' },
  ],
};

/** Absolute URL helper. Returns a path when siteUrl is not yet configured. */
export function absoluteUrl(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!site.siteUrl) {
    return normalized;
  }
  return `${site.siteUrl.replace(/\/$/, '')}${normalized}`;
}

/** True only when donations may appear in UI, metadata, or structured data. */
export function donationsAreEnabled(): boolean {
  return site.donationsEnabled === true;
}

/** Social profiles that have a real URL configured. */
export function configuredSocialLinks(): Array<{ label: string; href: string }> {
  const labels: Record<keyof SocialLinks, string> = {
    bluesky: 'Bluesky',
    facebook: 'Facebook',
    github: 'GitHub',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    mastodon: 'Mastodon',
    threads: 'Threads',
    x: 'X',
    youtube: 'YouTube',
  };

  return (Object.keys(labels) as Array<keyof SocialLinks>)
    .map((key) => {
      const href = site.socialLinks[key];
      if (!href) return null;
      return { label: labels[key], href };
    })
    .filter((item): item is { label: string; href: string } => item !== null);
}

export function hasFoundationNote(): boolean {
  return Boolean(site.foundationNote.statement.trim() && site.foundationNote.name.trim());
}

export const copyrightYear = new Date().getFullYear();
