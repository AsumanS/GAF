import { lostBooksArticleBody } from './articles/theLostBooksThatWereNeverLost';

export type ArticleCategoryId =
  | 'circulation'
  | 'rediscovery'
  | 'canon'
  | 'memory'
  | 'translation'
  | 'oral-tradition';

export type ArticleMotif =
  | 'circulation'
  | 'rediscovery'
  | 'canon'
  | 'memory'
  | 'translation'
  | 'oral-tradition';

/** Public listings include only `published`. A date does not publish an article. */
export type ArticleStatus = 'draft' | 'planned' | 'unpublished' | 'published';

export type ArticleImage = {
  src: string;
  alt: string;
  /** Visible credit line, such as an artist and rights statement. */
  credit?: string;
};

/** An illustration placed immediately before a paragraph in the article body. */
export type ArticleInlineFigure = {
  beforeParagraph: string;
  src: string;
  alt: string;
  credit?: string;
};

export type ArticleSource = {
  citation: string;
  url?: string;
};

export type ResearchArticle = {
  slug: string;
  title: string;
  categoryId: ArticleCategoryId;
  motif: ArticleMotif;
  summary: string;
  status: ArticleStatus;
  /**
   * ISO date (YYYY-MM-DD) once the article is released.
   * Used only to order published articles. Leave empty until a real date is known.
   */
  publishedOn: string;
  /** Optional historical or archival image. The motif is used when this is absent. */
  image?: ArticleImage;
  /** Opening sentence shown under the title and on the article card. */
  lede?: string;
  paragraphs?: string[];
  figures?: ArticleInlineFigure[];
  sources?: ArticleSource[];
  featured?: boolean;
};

export const articleCategories: Array<{ id: ArticleCategoryId; label: string }> = [
  { id: 'circulation', label: 'Cultural Circulation' },
  { id: 'rediscovery', label: 'Rediscovery' },
  { id: 'canon', label: 'Literary Canon' },
  { id: 'memory', label: 'Cultural Memory' },
  { id: 'translation', label: 'Translation' },
  { id: 'oral-tradition', label: 'Oral Tradition' },
];

/**
 * Research article records.
 * Planned and draft entries stay here, but only `status: 'published'` is shown publicly.
 */
export const researchArticles: ResearchArticle[] = [
  {
    slug: 'the-lost-books-that-were-never-lost',
    title: 'The Lost Books That Were Never Lost',
    categoryId: 'circulation',
    motif: 'circulation',
    summary: lostBooksArticleBody.lede,
    status: 'published',
    publishedOn: '2026-10-23',
    featured: true,
    image: {
      src: '/assets/research/german-popular-stories-cruikshank.jpg',
      alt: 'George Cruikshank illustration from German Popular Stories, showing villagers running from a cottage.',
      credit: 'Taylor, Cruikshank, Public domain, via Wikimedia Commons',
    },
    ...lostBooksArticleBody,
  },
  {
    slug: 'the-book-that-returned-after-a-thousand-years',
    title: 'The Book That Returned After a Thousand Years',
    categoryId: 'rediscovery',
    motif: 'rediscovery',
    summary:
      'How Lucretius’s De rerum natura returned to circulation after centuries out of general view.',
    status: 'planned',
    publishedOn: '',
  },
  {
    slug: 'who-decides-which-books-become-classics',
    title: 'Who Decides Which Books Become Classics?',
    categoryId: 'canon',
    motif: 'canon',
    summary: 'How a literary canon takes shape, and who takes part in deciding which books last.',
    status: 'planned',
    publishedOn: '',
  },
  {
    slug: 'what-civilizations-choose-to-remember',
    title: 'What Civilizations Choose to Remember',
    categoryId: 'memory',
    motif: 'memory',
    summary: 'Cultural memory: what a society preserves, and what it allows to be forgotten.',
    status: 'planned',
    publishedOn: '',
  },
  {
    slug: 'when-translation-changed-the-literary-canon',
    title: 'When Translation Changed the Literary Canon',
    categoryId: 'translation',
    motif: 'translation',
    summary: 'How translations have changed which works enter literary history.',
    status: 'planned',
    publishedOn: '',
  },
  {
    slug: 'before-history-was-written-it-was-told',
    title: 'Before History Was Written, It Was Told',
    categoryId: 'oral-tradition',
    motif: 'oral-tradition',
    summary:
      'How stories carried by speech held historical memory before they were written down.',
    status: 'planned',
    publishedOn: '',
  },
];

export const researchArticlesContent = {
  metaDescription:
    'Research articles from Golden Archive Foundation on literature, history, cultural heritage, translation, and cultural memory.',
  intro:
    'Golden Archive Foundation publishes research articles on literature, history, cultural heritage, translation, and cultural memory. These essays ask how works travel, how they are remembered, and how a culture decides what is worth keeping.',
  featuredHeading: 'Featured Article',
  latestHeading: 'Latest Articles',
  topicsHeading: 'Topics',
  topicsLabel: 'Article topics',
  allTopicsLabel: 'All topics',
  emptyTopic: 'No other articles are listed under this topic.',
  emptyState:
    'Our first research articles are currently in preparation. This section will feature original studies and critical essays on literary history, cultural heritage, translation, and the transmission of knowledge.',
};

export function categoryLabel(id: ArticleCategoryId): string {
  return articleCategories.find((category) => category.id === id)?.label ?? id;
}

export type PublicArticleListing = {
  featured?: ResearchArticle;
  latest: ResearchArticle[];
};

/** Newest dated articles first. Undated articles keep the list order. */
export function articlesInDateOrder(articles: ResearchArticle[]): ResearchArticle[] {
  return articles
    .map((article, index) => ({ article, index }))
    .sort((a, b) => {
      const aDate = a.article.publishedOn.trim();
      const bDate = b.article.publishedOn.trim();
      if (aDate && bDate && aDate !== bDate) return bDate.localeCompare(aDate);
      if (aDate && !bDate) return -1;
      if (!aDate && bDate) return 1;
      return a.index - b.index;
    })
    .map(({ article }) => article);
}

/**
 * Public Research Articles listing.
 * Status alone decides visibility. `publishedOn` only orders published articles.
 * Featured is the newest published article explicitly marked featured.
 */
export function publicArticleListing(articles: ResearchArticle[]): PublicArticleListing {
  const published = articlesInDateOrder(articles.filter((article) => article.status === 'published'));
  const featured = published.find((article) => article.featured === true);
  return {
    featured,
    latest: published.filter((article) => article.slug !== featured?.slug),
  };
}

/** Split a citation on *italic* markers. Unmarked text stays roman. */
export function citationSegments(citation: string): Array<{ text: string; italic: boolean }> {
  const segments: Array<{ text: string; italic: boolean }> = [];
  const pattern = /\*([^*]+)\*/g;
  let last = 0;
  for (const match of citation.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ text: citation.slice(last, index), italic: false });
    segments.push({ text: match[1] ?? '', italic: true });
    last = index + match[0].length;
  }
  if (last < citation.length) segments.push({ text: citation.slice(last), italic: false });
  return segments;
}

export function articleHref(article: Pick<ResearchArticle, 'slug' | 'status' | 'paragraphs'>): string {
  if (article.status === 'published' && (article.paragraphs?.length ?? 0) > 0) {
    return `/research/articles/${article.slug}`;
  }
  return `/research/articles#${article.slug}`;
}

export function formatArticleDate(iso: string): string {
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
