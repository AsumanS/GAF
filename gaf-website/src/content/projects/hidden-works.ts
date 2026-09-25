import type { ProjectPageContent } from '../../types/projectPage';

export const hiddenWorksContent: ProjectPageContent = {
  metaDescription:
    'Hidden Works looks for historically significant works that have never reached a general U.S. readership in an accessible English edition. Discover, contribute, or support cultural recovery.',
  opening:
    'Celebrating America’s 250th Anniversary Through New Discoveries from the World’s Literary Heritage',
  heroBody:
    'A book can remain known in one country, one language, or one scholarly tradition while being almost invisible to readers somewhere else. Hidden Works looks for historically significant works that have never reached a general U.S. readership in an accessible English edition.',
  statusNote: 'Entries are currently being accepted.',
  paragraphs: [
    'Some books disappear from public attention because they are rare. Others were never truly lost at all. They may still be published abroad, preserved in libraries, discussed by specialists, or read in their original language while remaining effectively unknown to a wider American audience.',
    'The Hidden Works Discovery Contest begins with a simple question: what important works are still waiting to be discovered by readers here? The project invites people to look beyond the familiar literary and historical canon and bring forward public-domain works whose ideas, stories, scholarship, or cultural significance deserve wider attention.',
    {
      html: 'The Hidden Works Discovery Contest was created to commemorate the 250th anniversary of the United States. To qualify, <strong>at least 250 years must have passed</strong> since the work was first published—or first made available to readers in book form—in its country of origin. This historical threshold connects the project directly to the anniversary while bringing works from the world’s literary heritage into view for American readers.',
    },
    {
      html: 'A strong discovery may come from an old bibliography, a library catalogue, a footnote, a family collection, a foreign-language edition, an academic reference, or simply from knowing a literary tradition that has received little attention in English. <em>What matters is the possibility that a work of genuine significance has remained outside the reach of the readers who might value it.</em>',
    },
    'Selected discoveries can open the way to deeper research, translation, editorial recovery, and publication. Through that process, Golden Archive Foundation aims to make important works easier to encounter again—not by treating them as historical curiosities, but by returning them to active cultural circulation.',
    {
      html: '<strong>The three works selected from the competition will be translated into English, published, and introduced to readers in the United States.</strong> Each edition will recognize the participant who brought the work forward, crediting them <strong>in the book and on the cover</strong> as the person who helped bring that work to a new readership.',
    },
    'The project is also an invitation to participate in cultural recovery. Librarians, researchers, translators, students, independent scholars, readers, and people with deep knowledge of particular languages or traditions may all encounter works that established publishing channels have overlooked. Hidden Works creates a way for those discoveries to be shared.',
  ],
  participate: {
    heading: 'Participate in the Contest',
    body: 'Know of an important work that deserves a wider audience? Submit the work for consideration and tell us why you believe it matters.',
    ctaLabel: 'Submit a Hidden Work',
    href: '/projects/hidden-works/submit',
  },
  contribute: {
    heading: 'Contribute Your Knowledge',
    body: 'Research, language expertise, bibliography, archival knowledge, and familiarity with particular literary or cultural traditions can help uncover and understand works that have remained outside general view.',
    ctaLabel: 'Volunteer',
    href: '/volunteer',
  },
  support: {
    heading: 'Support Project',
    body: 'Researching, translating, editing, designing, and publishing recovered works requires time and resources. Support helps Golden Archive Foundation bring worthwhile discoveries from identification to public access.',
    ctaLabel: 'Donate',
  },
};
