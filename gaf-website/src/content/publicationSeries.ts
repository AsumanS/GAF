import type { ArticleMotif } from './researchArticles';

export type SeriesStatus = 'ongoing' | 'completed';

export type PublicationSeries = {
  slug: string;
  title: string;
  description: string;
  motif: ArticleMotif;
  /**
   * Article slugs from researchArticles.ts, in publication order.
   * Do not add an article that has not been published in Research Articles.
   */
  articleSlugs: string[];
  status: SeriesStatus;
};

/**
 * Thematic groups of Research Articles.
 * A series does not contain essays of its own.
 */
export const publicationSeries: PublicationSeries[] = [
  {
    slug: 'the-second-life-of-books',
    title: 'The Second Life of Books',
    description:
      'Historical accounts of works that were rediscovered, translated, or returned to circulation.',
    motif: 'rediscovery',
    articleSlugs: ['the-book-that-returned-after-a-thousand-years'],
    status: 'ongoing',
  },
  {
    slug: 'beyond-the-familiar-canon',
    title: 'Beyond the Familiar Canon',
    description:
      'The limits of the literary canon, translation, and the visibility of works from different cultures.',
    motif: 'canon',
    articleSlugs: ['the-lost-books-that-were-never-lost'],
    status: 'ongoing',
  },
  {
    slug: 'cultural-memory-and-storytelling',
    title: 'Cultural Memory & Storytelling',
    description:
      'Narratives, memory, oral tradition, and the passing of knowledge from one generation to the next.',
    motif: 'memory',
    articleSlugs: ['what-civilizations-choose-to-remember'],
    status: 'ongoing',
  },
];

export const publicationSeriesContent = {
  metaDescription:
    'Publication series from Golden Archive Foundation, grouping Research Articles by shared subject and publication order.',
  ongoingHeading: 'Ongoing',
  completedHeading: 'Completed',
  completedEmpty: 'No series is complete yet.',
  orderHeading: 'Publication order',
  statusLabel: {
    ongoing: 'Ongoing',
    completed: 'Completed',
  } as const,
};

export function seriesByStatus(status: SeriesStatus): PublicationSeries[] {
  return publicationSeries.filter((series) => series.status === status);
}
