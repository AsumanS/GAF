import { describe, expect, it } from 'vitest';
import {
  publicArticleListing,
  researchArticles,
  type ResearchArticle,
} from '../src/content/researchArticles';

function article(overrides: Partial<ResearchArticle> & Pick<ResearchArticle, 'slug'>): ResearchArticle {
  return {
    title: overrides.slug,
    categoryId: 'canon',
    motif: 'canon',
    summary: 'Summary.',
    status: 'published',
    publishedOn: '',
    ...overrides,
  };
}

describe('public research article listing', () => {
  it('publishes only the completed Lost Books article', () => {
    const published = researchArticles.filter((entry) => entry.status === 'published');
    expect(published.map((entry) => entry.slug)).toEqual(['the-lost-books-that-were-never-lost']);
    expect(published[0]?.paragraphs?.length).toBeGreaterThan(0);
    expect(published[0]?.publishedOn).toBe('2026-10-23');

    const listing = publicArticleListing(researchArticles);
    expect(listing.featured?.slug).toBe('the-lost-books-that-were-never-lost');
    expect(listing.latest).toEqual([]);

    const hidden = researchArticles.filter((entry) => entry.status !== 'published');
    expect(hidden).toHaveLength(5);
    expect(hidden.every((entry) => entry.status === 'planned')).toBe(true);
  });

  it('does not treat a publication date as publication status', () => {
    const listing = publicArticleListing([
      article({
        slug: 'dated-draft',
        status: 'draft',
        publishedOn: '2026-10-01',
        featured: true,
      }),
      article({
        slug: 'dated-planned',
        status: 'planned',
        publishedOn: '2026-09-01',
      }),
      article({
        slug: 'dated-unpublished',
        status: 'unpublished',
        publishedOn: '2026-08-01',
      }),
    ]);

    expect(listing).toEqual({ featured: undefined, latest: [] });
  });

  it('shows one published article once', () => {
    const only = article({ slug: 'only', publishedOn: '2026-01-01' });
    const featuredOnly = article({
      slug: 'featured-only',
      publishedOn: '2026-01-01',
      featured: true,
    });

    expect(publicArticleListing([only])).toEqual({ featured: undefined, latest: [only] });
    expect(publicArticleListing([featuredOnly])).toEqual({
      featured: featuredOnly,
      latest: [],
    });
  });

  it('features only a published featured article and orders the rest newest first', () => {
    const older = article({ slug: 'older', publishedOn: '2024-01-01', categoryId: 'memory' });
    const newer = article({ slug: 'newer', publishedOn: '2026-06-01', categoryId: 'translation' });
    const featured = article({
      slug: 'featured',
      publishedOn: '2025-03-01',
      featured: true,
      categoryId: 'circulation',
    });
    const draftFeatured = article({
      slug: 'draft-featured',
      status: 'draft',
      publishedOn: '2026-12-01',
      featured: true,
    });

    const listing = publicArticleListing([older, draftFeatured, newer, featured]);

    expect(listing.featured?.slug).toBe('featured');
    expect(listing.latest.map((entry) => entry.slug)).toEqual(['newer', 'older']);
  });

  it('chooses the newest published featured article when more than one is marked', () => {
    const olderFeatured = article({
      slug: 'older-featured',
      publishedOn: '2024-05-01',
      featured: true,
    });
    const newerFeatured = article({
      slug: 'newer-featured',
      publishedOn: '2026-05-01',
      featured: true,
    });

    const listing = publicArticleListing([olderFeatured, newerFeatured]);

    expect(listing.featured?.slug).toBe('newer-featured');
    expect(listing.latest.map((entry) => entry.slug)).toEqual(['older-featured']);
  });
});
