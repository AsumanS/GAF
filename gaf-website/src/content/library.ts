/**
 * Library page content.
 */
export const libraryContent = {
  metaDescription:
    'A curated collection of scholarly articles, books, historical documents, lectures, videos, and other resources that inform and enrich Golden Archive Foundation’s intellectual and cultural work.',
  intro:
    'A curated collection of scholarly articles, books, historical documents, lectures, videos, and other resources that inform and enrich Golden Archive Foundation’s intellectual and cultural work. Bringing together valuable research, diverse perspectives, and significant works from across disciplines, the Library offers readers a place to explore the knowledge, ideas, and traditions that inspire our research and public programs.',
};

export type LibrarySection = {
  title: string;
  summary: string;
  href?: string;
};

export const librarySections: LibrarySection[] = [
  {
    title: 'Scholarly Articles',
    href: '/library/scholarly-articles',
    summary:
      'Selected academic research exploring literature, history, cultural heritage, human knowledge, and the ideas that shape our understanding of the world.',
  },
  {
    title: 'Books & Texts',
    summary:
      'Books, historical writings, and literary works that offer valuable perspectives on cultural traditions, intellectual history, and the transmission of knowledge across generations.',
  },
  {
    title: 'Videos & Lectures',
    summary:
      'A curated selection of documentaries, lectures, interviews, and educational videos exploring history, literature, mythology, art, and cultural heritage.',
  },
  {
    title: 'Archives & Collections',
    summary:
      'Digital archives, manuscript collections, historical records, and cultural repositories that preserve original materials and make them accessible for research and discovery.',
  },
];
