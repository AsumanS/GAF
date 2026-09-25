import type { Project } from '../data/projects';

/** Plain text or trusted HTML paragraph for project body copy. */
export type ProjectPageParagraph = string | { html: string };

export type ProjectPageAction = {
  heading: string;
  body: string;
  ctaLabel: string;
  href: string;
};

/**
 * Canonical project detail page content shape.
 * Every project page (Hidden Works, Worlds Imagined, and future projects)
 * should supply this structure and render through ProjectPageLayout.
 */
export type ProjectPageContent = {
  metaDescription: string;
  /** Short line under the title in the hero. */
  opening: string;
  /** Supporting hero paragraph under the opening. */
  heroBody: string;
  /** Optional status line in the hero (e.g. entries open). */
  statusNote?: string;
  /** Main body paragraphs below the hero. */
  paragraphs: ProjectPageParagraph[];
  /** Optional primary participate row (copy left, CTA right). */
  participate?: ProjectPageAction;
  /** Left action card — typically volunteer / knowledge. */
  contribute: ProjectPageAction;
  /** Right action card — support / donate (href resolved by layout). */
  support: {
    heading: string;
    body: string;
    ctaLabel: string;
  };
};

export type ProjectPageProps = {
  project: Project;
  content: ProjectPageContent;
};
