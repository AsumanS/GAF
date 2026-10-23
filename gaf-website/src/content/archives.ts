export type ArchiveLink = {
  label: string;
  href: string;
};

export type ArchiveRecord = {
  slug: string;
  title: string;
  author: string;
  originalLanguage: string;
  /** Date of the work, as established by the record. Not the date this page was updated. */
  date: string;
  summary: string;
  featured?: boolean;
  historicalContext: string;
  publicationHistory: string;
  survivingCopies: string;
  /** Library catalog records for identified copies. Leave empty until a real record is cited. */
  catalogLinks: ArchiveLink[];
  /** Digital copies of identified manuscripts or editions. Leave empty until a real copy is cited. */
  digitalCopies: ArchiveLink[];
  englishEditions: string;
  scholarlySignificance: string;
  openQuestions: string[];
  bibliography: ArchiveLink[];
};

export type RecordSection = {
  number: string;
  title: string;
  description: string;
};

/**
 * From the Archives.
 * Add a record only after a work has been selected and its sources checked.
 * Do not invent titles, authors, dates, copies, or links.
 */
export const archiveRecords: ArchiveRecord[] = [];

export const archiveRecordSections: RecordSection[] = [
  {
    number: '01',
    title: 'Identification',
    description:
      'The work’s title, author, original language, date, and a short account of what it is.',
  },
  {
    number: '02',
    title: 'Historical Context',
    description: 'The setting in which the work was made and first circulated.',
  },
  {
    number: '03',
    title: 'Publication History',
    description: 'How the work was issued, reprinted, and transmitted.',
  },
  {
    number: '04',
    title: 'Surviving Copies',
    description:
      'Known manuscripts and printed editions, with library catalog records and digital copies when a specific copy has been identified.',
  },
  {
    number: '05',
    title: 'English Editions',
    description: 'English translations and editions, and what they make available to readers.',
  },
  {
    number: '06',
    title: 'Scholarly Significance',
    description: 'Why the work matters for research and for a wider readership.',
  },
  {
    number: '07',
    title: 'Open Questions',
    description: 'What the sources do not yet settle.',
  },
  {
    number: '08',
    title: 'Bibliography',
    description: 'The sources the record relies on.',
  },
];

export const archivesContent = {
  metaDescription:
    'Source-based research records from Golden Archive Foundation on individual historical works, manuscripts, early editions, and bibliographic discoveries.',
  intro:
    'From the Archives publishes source-based research records on single historical works: manuscripts, early editions, and bibliographic discoveries. Each record stays with one work, rather than with a general question.',
  contrast:
    'takes up a broader subject. A record here asks what a particular work is, how it was transmitted, which copies survive, and what can be read in English.',
  featuredHeading: 'Featured Discovery',
  featuredEmpty:
    'No work is featured yet. Three candidate works will be identified for the first record. Their publication history and availability in English will be examined, and one work will be selected.',
  recordsHeading: 'Research Records',
  recordsEmpty: 'No research records are published yet.',
  recordsMore: 'Further records will appear here as they are published.',
  sectionsHeading: 'Inside a research record',
  sectionsIntro:
    'The first record, and those that follow it, will be organized under these headings.',
};

export function featuredArchiveRecord(): ArchiveRecord | undefined {
  return archiveRecords.find((record) => record.featured) ?? archiveRecords[0];
}

export function otherArchiveRecords(featured?: ArchiveRecord): ArchiveRecord[] {
  if (!featured) return archiveRecords;
  return archiveRecords.filter((record) => record.slug !== featured.slug);
}
