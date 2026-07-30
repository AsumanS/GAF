/**
 * Shared status labels for institutional and project facts.
 * Use sparingly — only for meaningful distinctions between completed and planned work.
 */
export type FactStatus = 'established' | 'in-progress' | 'planned' | 'not-yet-open';

export const factStatusLabel: Record<FactStatus, string> = {
  established: 'Established',
  'in-progress': 'In Progress',
  planned: 'Planned',
  'not-yet-open': 'Not Yet Open',
};

export type WorkItem = {
  id: string;
  title: string;
  stage: FactStatus;
  lastUpdated: string;
  explanation: string;
};

export type TrustFact = {
  id: string;
  label: string;
  detail?: string;
};

export type FoundationNote = {
  statement: string;
  name: string;
  role: string;
  date: string;
  /** Path under /public when a real photograph is available. */
  photoSrc: string;
  photoAlt: string;
};

export type OpenQuestion = {
  id: string;
  question: string;
  note: string;
};

export type MediaAssetRef = {
  /** Public path when the file exists; empty string when absent. */
  src: string;
  alt: string;
  caption: string;
  credit: string;
  purpose: string;
  suggestedType: string;
  rightsStatus: string;
  dimensions: string;
};
