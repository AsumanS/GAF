export type ConversationLink = {
  label: string;
  href: string;
};

export type ScholarlyConversation = {
  slug: string;
  title: string;
  summary: string;
  /**
   * Named participant. Leave empty until that person has agreed to be named.
   * Do not invent a name.
   */
  participantName: string;
  expertise: string;
  /**
   * Institutional affiliation. Leave empty until it is confirmed.
   * Do not invent an institution.
   */
  affiliation: string;
  /**
   * ISO date (YYYY-MM-DD) once the conversation is published.
   * Leave empty until a real date is known. Do not invent one.
   */
  publishedOn: string;
  featured?: boolean;
  /** Links to research and works already published on this site. */
  related: ConversationLink[];
};

/**
 * Opening scholarly conversations.
 * Order is the publication sequence until publishedOn dates are supplied.
 */
export const scholarlyConversations: ScholarlyConversation[] = [
  {
    slug: 'how-do-forgotten-books-survive',
    title: 'How Do Forgotten Books Survive?',
    summary:
      'How books fall out of view, and how manuscripts, copies, and readers keep them from disappearing.',
    participantName: '',
    expertise: 'Book historian and manuscript specialist',
    affiliation: '',
    publishedOn: '',
    featured: true,
    related: [
      { label: 'From the Archives', href: '/research/archives' },
      { label: 'Hidden Works', href: '/projects/hidden-works' },
    ],
  },
  {
    slug: 'the-books-that-never-crossed-borders',
    title: 'The Books That Never Crossed Borders',
    summary: 'How a work can be familiar in one literary culture and remain unread beyond it.',
    participantName: '',
    expertise: 'Comparative literature researcher',
    affiliation: '',
    publishedOn: '',
    related: [
      { label: 'Research Articles', href: '/research/articles' },
      { label: 'Hidden Works', href: '/projects/hidden-works' },
    ],
  },
  {
    slug: 'what-makes-a-historical-work-worth-rediscovering',
    title: 'What Makes a Historical Work Worth Rediscovering?',
    summary: 'What leads a reader back to a historical work, and what that return asks of the sources.',
    participantName: '',
    expertise: 'Literary historian',
    affiliation: '',
    publishedOn: '',
    related: [
      { label: 'From the Archives', href: '/research/archives' },
      { label: 'Hidden Works', href: '/projects/hidden-works' },
    ],
  },
  {
    slug: 'the-challenges-of-translating-historical-texts',
    title: 'The Challenges of Translating Historical Texts',
    summary:
      'What makes a historical text difficult to translate, and what a translation can carry across.',
    participantName: '',
    expertise: 'Literary translator and translation researcher',
    affiliation: '',
    publishedOn: '',
    related: [
      { label: 'Research Articles', href: '/research/articles' },
      { label: 'Hidden Works', href: '/projects/hidden-works' },
    ],
  },
  {
    slug: 'inside-the-worlds-forgotten-collections',
    title: "Inside the World's Forgotten Collections",
    summary: 'What rare-book librarians and archivists encounter in collections most readers never see.',
    participantName: '',
    expertise: 'Rare books librarian and archivist',
    affiliation: '',
    publishedOn: '',
    related: [{ label: 'From the Archives', href: '/research/archives' }],
  },
];

export const conversationsContent = {
  metaDescription:
    'Conversations with historians, literary researchers, translators, bibliographers, librarians, and other specialists, published by Golden Archive Foundation.',
  intro:
    'Scholarly Conversations publishes interviews with historians, literary researchers, translators, bibliographers, librarians, and other specialists. Each conversation stays with the works, copies, and questions in the Foundation’s research.',
  featuredHeading: 'Featured Conversation',
  latestHeading: 'Latest Conversations',
  relatedHeading: 'Related research',
};

/** Newest dated conversations first. Undated conversations keep the list order. */
export function conversationsInDateOrder(
  conversations: ScholarlyConversation[],
): ScholarlyConversation[] {
  return conversations
    .map((conversation, index) => ({ conversation, index }))
    .sort((a, b) => {
      const aDate = a.conversation.publishedOn.trim();
      const bDate = b.conversation.publishedOn.trim();
      if (aDate && bDate && aDate !== bDate) return bDate.localeCompare(aDate);
      if (aDate && !bDate) return -1;
      if (!aDate && bDate) return 1;
      return a.index - b.index;
    })
    .map(({ conversation }) => conversation);
}

export function formatConversationDate(iso: string): string {
  const value = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
