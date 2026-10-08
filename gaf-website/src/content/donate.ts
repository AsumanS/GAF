export type DonationJurisdictionDisclosure = {
  /** Jurisdiction label, e.g. "New York" — leave empty until verified. */
  jurisdiction: string;
  /** Verified disclosure text supplied by counsel — never invent. */
  text: string;
};

/**
 * Donate page copy and disclosure placeholders.
 * Do not invent tax promises, registration numbers, or jurisdiction language.
 */
export const donateContent = {
  metaDescription:
    'Support Golden Archive Foundation — information about contributing to research, publishing, and public programs.',
  heading: 'Support Golden Archive Foundation',
  intro:
    'Your contribution supports our mission to preserve, rediscover, and share cultural knowledge through research, publishing, and public programs.',
  unavailable: {
    heading: 'Online Giving',
    paragraphs: [
      'Online giving is not currently available. Golden Archive Foundation is completing the compliance and administrative work required for future fundraising activities.',
      'For questions about supporting the Foundation, please contact:',
    ],
  },
  form: {
    frequencyLegend: 'Donation Frequency',
    amountLegend: 'Donation Amount',
    otherLabel: 'Other',
    customAmountLabel: 'Custom amount (USD)',
    customAmountHint: 'Minimum $1.00. Up to two decimal places.',
    anonymousLabel: 'Make this donation anonymously',
    anonymousHelp:
      'If selected, your name will not be used in public acknowledgment materials. Payment processors and legally required financial records still need the information they collect to complete a transaction.',
    processingLabel: 'Help cover payment processing costs',
    processingHelp:
      'Payment processors charge a fee for each transaction. By covering this cost, you help ensure that more of your donation goes directly toward the Foundation’s mission.',
    summaryHeading: 'Donation Summary',
    summaryFrequency: 'Frequency',
    summaryDescription: 'Description',
    summaryAmountColumn: 'Amount',
    summaryDonation: 'Donation',
    summaryProcessingFee: 'Processing fee (optional)',
    summaryTotal: 'Total payable',
    cardButton: 'Donate with Card',
    paypalButton: 'Donate with PayPal',
  },
  trust: {
    heading: 'Trust and Transparency',
    tax: {
      heading: 'Tax-Deductible Contributions',
      body: 'Golden Archive Foundation is recognized as a 501(c)(3) tax-exempt public charity. Contributions are tax-deductible to the extent permitted by law. EIN 41-2754875.',
    },
    secure: {
      heading: 'Secure Payments',
      body: 'Donations are processed securely by our payment providers. Golden Archive Foundation does not store complete payment card information.',
    },
    questions: {
      heading: 'Questions About Donating?',
      bodyPrefix: 'For questions about supporting the Foundation, contact',
    },
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Transparency', href: '/transparency' },
    ],
  },
  legal: {
    heading: 'Legal Disclosures',
    body: 'Golden Archive Foundation is a Texas nonprofit corporation and a tax-exempt public charity under Section 501(c)(3) of the Internal Revenue Code.',
    solicitationLinkLabel: 'State Charitable Solicitation Disclosures',
    solicitationHref: '/state-charitable-solicitation-disclosures',
    /**
     * Placeholder list for future verified disclosures.
     * Add entries only with counsel-approved text.
     */
    jurisdictions: [] as DonationJurisdictionDisclosure[],
  },
};
