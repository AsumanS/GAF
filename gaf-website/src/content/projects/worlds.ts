import type { ProjectPageContent } from '../../types/projectPage';

/**
 * Worlds Imagined detail page — same ProjectPageContent shape as Hidden Works.
 * Body copy drawn from the existing project premise; action sections mirror the
 * canonical project-page format without inventing new programs.
 */
export const worldsContent: ProjectPageContent = {
  metaDescription:
    'Worlds Imagined: An Atlas of Mythic Cosmologies brings cultural world models together through research, illustration, and storytelling.',
  opening: 'Every culture has imagined the shape of the world.',
  heroBody:
    'Where it begins and ends, what lies above or below it, how the heavens are arranged, where extraordinary beings dwell, and how human life fits within a larger cosmos. Those ideas survive in stories, maps, sacred geographies, diagrams, art, and traditions passed across generations.',
  paragraphs: [
    'Worlds Imagined: An Atlas of Mythic Cosmologies brings these visions together in a collaborative atlas of mythic world models. Through research, illustration, and storytelling, contributors explore how cultures around the world have pictured the structure of existence and transform that research into engaging entries for a wider public.',
    'The project places different cosmologies side by side, allowing readers to discover both their striking differences and the questions they share.',
  ],
  contribute: {
    heading: 'Contribute Your Knowledge',
    body: 'Worlds Imagined welcomes volunteer researchers, writers, illustrators, and contributors with knowledge of mythic traditions from around the world. Contributions may include research, source documentation, writing, illustration, diagrams, and other work that helps turn a cultural world model into a carefully developed atlas entry.',
    ctaLabel: 'Volunteer',
    href: '/volunteer',
  },
  support: {
    heading: 'Support Project',
    body: 'Research, illustration, editorial work, and public presentation require time and resources. Support helps Golden Archive Foundation develop Worlds Imagined entries and share them with a wider audience.',
    ctaLabel: 'Donate',
  },
};
