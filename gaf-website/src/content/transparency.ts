import { site } from '../config/site';

export type TransparencyLink = {
  label: string;
  href: string;
};

export const transparencyContent = {
  metaDescription: `Tax-exempt status, governance, and financial transparency for ${site.organizationName}.`,
  intro:
    'Golden Archive Foundation is committed to responsible governance, financial transparency, and public accountability. Organizational, governance, and financial records are available below.',
  taxExempt: {
    heading: 'Tax-Exempt Status',
    body: 'Golden Archive Foundation is recognized by the Internal Revenue Service as a tax-exempt organization under Section 501(c)(3) and is classified as a public charity.',
    links: [
      {
        label: 'IRS Determination Letter',
        href: site.determinationLetterUrl,
      },
      {
        label: 'IRS Tax-Exempt Organization Record',
        href: site.irsSearchUrl,
      },
    ] satisfies TransparencyLink[],
    source: {
      prefix: 'Source:',
      label: 'IRS Exempt Organizations Business Master File Extract',
      href: 'https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf',
    },
  },
  governance: {
    heading: 'Governance',
    links: [
      {
        label: 'Certificate / Articles of Formation',
        href: site.formationDocumentUrl,
      },
      {
        label: 'Bylaws',
        href: site.bylawsUrl,
      },
      {
        label: 'Conflict-of-Interest Policy',
        href: site.conflictOfInterestPolicyUrl,
      },
    ] satisfies TransparencyLink[],
  },
  financial: {
    heading: 'Financial Reports & Filings',
    year: '2025',
    links: [
      {
        label: 'Annual Filing / Form 990-EZ',
        href: site.form990Url,
      },
      {
        label: 'Annual Report',
        href: site.annualReportUrl,
      },
      {
        label: 'Financial Statements',
        href: site.financialStatementsUrl,
      },
    ] satisfies TransparencyLink[],
  },
};
