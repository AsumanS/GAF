export type ProjectStatus = 'in-development' | 'active' | 'completed';

export type Project = {
  id: string;
  number: string;
  title: string;
  slug: string;
  href: string;
  status: ProjectStatus;
  statusLabel: string;
  premise: string;
  defined: string[];
  remaining: string[];
  linkLabel: string;
  layout: 'bibliographic' | 'spatial';
};

export const projects: Project[] = [
  {
    id: 'lost-stories',
    number: '01',
    title: 'Lost Stories',
    slug: 'lost-stories',
    href: '/projects/lost-stories',
    status: 'in-development',
    statusLabel: 'In development',
    premise:
      'A research and discovery initiative seeking historically significant public-domain works that have never reached a general English-language readership in the United States.',
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
    linkLabel: 'Read the Lost Stories project outline',
    layout: 'bibliographic',
  },
  {
    id: 'worlds-imagined',
    number: '02',
    title: 'Worlds Imagined',
    slug: 'worlds',
    href: '/projects/worlds',
    status: 'in-development',
    statusLabel: 'In development',
    premise:
      'An interdisciplinary project documenting how cultures have pictured the structure of the world through cosmology, sacred geography, narrative, art, and maps.',
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
    linkLabel: 'Examine the Worlds Imagined framework',
    layout: 'spatial',
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
