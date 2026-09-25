export type ProjectStatus = 'in-development' | 'active' | 'completed';

export type ProjectImage = {
  /** Public path under /assets or /images — single source for Home, index, and detail pages. */
  src: string;
  alt: string;
};

export type Project = {
  id: string;
  number: string;
  title: string;
  slug: string;
  href: string;
  status: ProjectStatus;
  premise: string[];
  defined: string[];
  remaining: string[];
  linkLabel: string;
  layout: 'bibliographic' | 'spatial';
  image: ProjectImage;
};

export const projects: Project[] = [
  {
    id: 'hidden-works',
    number: '01',
    title: 'The Hidden Works Discovery Contest',
    slug: 'hidden-works',
    href: '/projects/hidden-works',
    status: 'in-development',
    premise: [
      'Some important works are hidden in plain sight. A book can remain known in one country, one language, or one scholarly tradition while being almost invisible to readers somewhere else.',
      'Hidden Works looks for historically significant works that have never reached a general U.S. readership in an accessible English edition—and invites people to bring those discoveries forward.',
    ],
    defined: [
      'Core discovery problem and public-readership focus',
      'Working distinction between specialist survival and general availability',
      'Draft evidence expectations for publication history',
    ],
    remaining: [
      'Final eligibility rules and age thresholds',
      'Jury composition and review protocol',
      'Submission period and publication pathway agreements',
    ],
    linkLabel: 'Get Involved',
    layout: 'bibliographic',
    image: {
      src: '/assets/lost-stories.jpg',
      alt: 'Antique books on dark wooden shelves in an old library',
    },
  },
  {
    id: 'worlds-imagined',
    number: '02',
    title: 'Worlds Imagined: An Atlas of Mythic Cosmologies',
    slug: 'worlds',
    href: '/projects/worlds',
    status: 'in-development',
    premise: [
      'Every culture has imagined the shape of the world: where it begins and ends, what lies above or below it, how the heavens are arranged, where extraordinary beings dwell, and how human life fits within a larger cosmos. Those ideas survive in stories, maps, sacred geographies, diagrams, art, and traditions passed across generations.',
      'Worlds Imagined: An Atlas of Mythic Cosmologies brings these visions together in a collaborative atlas of mythic world models. Through research, illustration, and storytelling, contributors explore how cultures around the world have pictured the structure of existence and transform that research into engaging entries for a wider public. The project places different cosmologies side by side, allowing readers to discover both their striking differences and the questions they share.',
    ],
    defined: [
      'Source categories spanning narrative, material, and cartographic evidence',
      'Working rules separating historical sources from modern reconstruction',
      'Contributor disciplines needed for careful interpretation',
    ],
    remaining: [
      'Entry templates and specialist review workflow',
      'Illustration and diagram standards for public presentation',
      'Publication sequence for completed research units',
    ],
    linkLabel: 'Get Involved',
    layout: 'spatial',
    image: {
      src: '/assets/worlds-imagined.jpg',
      alt: 'Artwork representing cultural world models for the Worlds Imagined project',
    },
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
