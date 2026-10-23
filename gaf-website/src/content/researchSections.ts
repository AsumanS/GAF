export type ResearchEntry = {
  title: string;
  meta: string;
  summary: string;
  href: string;
};

export type ResearchSection = {
  slug: 'articles' | 'archives' | 'conversations' | 'series';
  title: string;
  href: string;
  /** Short description used on the Research & Publications index. */
  summary: string;
  metaDescription: string;
  intro: string;
  empty: string;
  /**
   * Published entries only. Leave empty until a real piece is ready.
   * Do not invent titles, dates, or links.
   */
  items: ResearchEntry[];
};

export const researchSections: ResearchSection[] = [
  {
    slug: 'articles',
    title: 'Research Articles',
    href: '/research/articles',
    summary:
      'Original research and critical essays exploring literature, history, cultural heritage, translation, and the transmission of knowledge across cultures and generations.',
    metaDescription:
      'Research articles from Golden Archive Foundation on literature, history, cultural heritage, translation, and cultural memory.',
    intro:
      'Golden Archive Foundation publishes research articles on literature, history, cultural heritage, translation, and cultural memory.',
    empty: 'No articles are listed yet. New articles will appear here as they are published.',
    items: [],
  },
  {
    slug: 'archives',
    title: 'From the Archives',
    href: '/research/archives',
    summary:
      'Bibliographic investigations of historical works, manuscripts, and early editions, tracing their origins, survival, publication histories, and accessibility.',
    metaDescription:
      'Source-based research records from Golden Archive Foundation on individual historical works, manuscripts, early editions, and bibliographic discoveries.',
    intro:
      'From the Archives publishes source-based research records on single historical works, rather than on general questions.',
    empty: 'No archive studies are listed yet. New studies will appear here as they are published.',
    items: [],
  },
  {
    slug: 'conversations',
    title: 'Scholarly Conversations',
    href: '/research/conversations',
    summary:
      'Conversations with historians, literary scholars, translators, librarians, and other specialists about the works and traditions they study.',
    metaDescription:
      'Conversations with historians, literary researchers, translators, bibliographers, librarians, and other specialists, published by Golden Archive Foundation.',
    intro:
      'Scholarly Conversations publishes interviews with historians, literary researchers, translators, bibliographers, librarians, and other specialists.',
    empty: 'No conversations are listed yet. New interviews will appear here as they are published.',
    items: [],
  },
  {
    slug: 'series',
    title: 'Publication Series',
    href: '/research/series',
    summary:
      'Thematic collections that bring related research articles together for a deeper exploration of shared questions and subjects.',
    metaDescription:
      'Publication series from Golden Archive Foundation, grouping Research Articles by shared subject and publication order.',
    intro:
      'Publication Series groups articles from Research Articles around a shared subject. A series does not publish essays of its own.',
    empty: 'No series are listed yet. New series will appear here as they are published.',
    items: [],
  },
];

export function getResearchSection(slug: ResearchSection['slug']): ResearchSection {
  const section = researchSections.find((item) => item.slug === slug);
  if (!section) {
    throw new Error(`Unknown research section: ${slug}`);
  }
  return section;
}
