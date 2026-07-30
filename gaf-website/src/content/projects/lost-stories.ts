import type { OpenQuestion } from '../../types/content';

export const lostStoriesContent = {
  metaDescription:
    'Project dossier for Lost Stories: a research and discovery initiative for historically significant public-domain works not yet available to general English-language readers in the United States.',
  statusLine: 'Project status: in development. Submissions are not open.',
  premise: {
    heading: 'Project premise',
    paragraphs: [
      'Lost Stories seeks historically significant public-domain works that have not been published in English for a general United States readership.',
      'The project treats discovery as research: entrants would identify a work, document its publication history, and show why general readers still cannot reach it in a responsible English edition.',
    ],
  },
  discoveryProblem: {
    heading: 'The precise discovery problem',
    paragraphs: [
      'A work may survive in libraries, catalogs, or specialist scholarship and still be unavailable to ordinary readers. Survival is not the same as public access.',
      'Lost Stories focuses on that gap—especially where English-language presentation for a general audience is missing, incomplete, or confined to specialist venues.',
    ],
  },
  unavailableMeans: {
    heading: 'What “unavailable to general readers” means',
    paragraphs: [
      'For this project, “unavailable” does not mean “unknown to every scholar.” It means a general United States reader cannot reasonably obtain a complete, carefully introduced English edition suited to public reading.',
      'Specialist articles, catalog entries, partial quotations, or academic editions that assume expert context may still leave the work effectively closed to the public the foundation intends to serve.',
    ],
  },
  eligibility: {
    heading: 'Proposed eligibility framework',
    paragraphs: [
      'Eligibility details remain under development. The working framework expects public-domain status, historical significance, and a documented claim that no suitable general English edition exists for United States readers.',
      'Final thresholds—age of work, length, geography, and evidence standards—will be published as official rules before any call opens.',
    ],
  },
  categories: {
    heading: 'Two discovery categories',
    items: [
      {
        title: 'Untranslated or never issued in English for general readers',
        text: 'Works that survive in another language or format without a complete English edition meant for public reading in the United States.',
      },
      {
        title: 'English survival limited to specialist or fragmentary forms',
        text: 'Works that appear in English only through excerpts, rare academic contexts, or presentations that leave the whole inaccessible to general readers.',
      },
    ],
  },
  evidence: {
    heading: 'Evidence expected from entrants',
    items: [
      'Clear bibliographic identification of the work',
      'Documented publication history and public-domain rationale',
      'Search notes showing what English editions or introductions were checked',
      'A concise argument for historical significance and public interest',
      'Honest notes on uncertainty where the record is incomplete',
    ],
  },
  review: {
    heading: 'Review and verification methodology',
    paragraphs: [
      'Review would test claims against catalogs, library records, and published bibliographies before interpretive judgment begins.',
      'The method is designed to separate discovery from celebration: a compelling story about a work is not enough without verifiable publication evidence.',
    ],
  },
  pathway: {
    heading: 'Publication-development pathway',
    paragraphs: [
      'Selected discoveries would move into a separate development path: contextual research, translation or editorial planning where appropriate, and eventual public presentation.',
      'Selection as a discovery does not automatically create a finished book. Publication depends on rights clarity, editorial capacity, and further verification.',
    ],
  },
  unresolved: {
    heading: 'Current unresolved decisions',
    items: [
      'Final minimum age and length boundaries for eligible works',
      'Geographic and language scope of the call',
      'Exact evidence standard for prior English publication',
      'Jury composition and conflict-of-interest procedures',
      'Submission window, agreements, and number of selected works',
    ],
  },
  openQuestions: [
    {
      id: 'age',
      question: 'What minimum age should eligible works meet?',
      note: 'Under discussion. The answer must balance historical distance with public-domain clarity.',
    },
    {
      id: 'length',
      question: 'What length boundaries should apply?',
      note: 'Short works, long narratives, and fragmentary corpora raise different editorial burdens. Boundaries are not yet fixed.',
    },
    {
      id: 'geography',
      question: 'How should geographic eligibility be defined?',
      note: 'The public-readership frame is United States–facing; source geography remains an open design question.',
    },
    {
      id: 'english-standard',
      question: 'What counts as prior English publication for general readers?',
      note: 'The project needs a workable standard distinguishing specialist survival from public availability.',
    },
    {
      id: 'jury',
      question: 'How will the jury and reviewers be composed?',
      note: 'Appointments will be announced only when roles, conflicts policy, and review protocol are ready.',
    },
    {
      id: 'period',
      question: 'When will the submission period open?',
      note: 'Not scheduled. Official rules must be published first.',
    },
    {
      id: 'agreement',
      question: 'What publication agreement will selected entrants receive?',
      note: 'Draft terms are not yet ready for public review.',
    },
    {
      id: 'count',
      question: 'How many works may be selected in a cycle?',
      note: 'Capacity and editorial quality will determine the number; no figure has been announced.',
    },
  ] satisfies OpenQuestion[],
};
