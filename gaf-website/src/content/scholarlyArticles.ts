export type ScholarlyArticleCategoryId = 'literature' | 'mythology' | 'reading';

export type ScholarlyArticle = {
  title: string;
  authors: string;
  year: string;
  publication: string;
  categoryId: ScholarlyArticleCategoryId;
  intro: string;
  href: string;
};

export const scholarlyArticleCategories: Array<{
  id: ScholarlyArticleCategoryId;
  label: string;
}> = [
  { id: 'literature', label: 'Literature and Cultural Transmission' },
  { id: 'mythology', label: 'Mythology, Cosmology, and Cultural Memory' },
  { id: 'reading', label: 'The Importance and Effects of Reading' },
];

export const scholarlyArticlesContent = {
  metaDescription:
    'Selected academic research on literature, history, cultural heritage, human knowledge, and the ideas that shape our understanding of the world.',
  intro:
    'Selected academic research exploring literature, history, cultural heritage, human knowledge, and the ideas that shape our understanding of the world.',
  topicsHeading: 'Topics',
  topicsLabel: 'Article topics',
  allTopicsLabel: 'All topics',
  emptyTopic: 'No articles are listed under this topic.',
  readLabel: 'Read the article',
};

export const scholarlyArticles: ScholarlyArticle[] = [
  {
    title: 'Engaging Newcomers with the Global Great Unread: Working Together to Expand the Canon',
    authors: 'Milan Terlunen',
    year: '2025',
    publication: 'Public Humanities / Cambridge University Press',
    categoryId: 'literature',
    intro:
      'Which works become classics, and which remain largely unread despite surviving in libraries and archives? This article considers the vast body of literature that falls outside the familiar canon and asks how new readers might help bring it into view. It treats literary discovery as a shared undertaking rather than the exclusive domain of established specialists. The result is a useful starting point for reconsidering whose knowledge shapes our reading lists.',
    href: 'https://www.cambridge.org/core/journals/public-humanities/article/engaging-newcomers-with-the-global-great-unread-working-together-to-expand-the-canon/2ED16C2C5E24391C8314974F0DD08A7C',
  },
  {
    title:
      'Agents of Circulation: Translating, Publishing, and Reading Turkish Literature in the Anglosphere',
    authors: 'Özlem Berk Albachten and Daniela La Penna',
    year: '2026',
    publication: 'Middle Eastern Literatures',
    categoryId: 'literature',
    intro:
      'A literary work does not cross a language barrier simply because someone translates it. Publishers, translators, reviewers, and readers all influence which books travel and how they are received. Focusing on Turkish literature in the English-speaking world, this study examines the people and institutions behind that circulation. It invites readers to look beyond individual books to the networks that make international literary recognition possible.',
    href: 'https://www.tandfonline.com/doi/full/10.1080/1475262X.2026.2680884',
  },
  {
    title: 'World Literature: What Gets Lost in Translation?',
    authors: 'Nicholas Harrison',
    year: '2014',
    publication: 'Journal of Commonwealth Literature',
    categoryId: 'literature',
    intro:
      'Translation opens a path to literature that many readers would otherwise never encounter, but every new language also changes the experience of a work. This article explores what may be lost when style, voice, and cultural meaning move across linguistic boundaries. Its questions complicate the idea that wider circulation always means fuller understanding. For anyone concerned with world literature, access and fidelity emerge as related but distinct goals.',
    href: 'https://journals.sagepub.com/doi/10.1177/0021989414535420',
  },
  {
    title: 'Reassembling Digital Archives—Strategies for Counter-Archiving',
    authors: 'Tobias Blanke',
    year: '2024',
    publication: 'Humanities and Social Sciences Communications',
    categoryId: 'literature',
    intro:
      'Digital archives can make cultural records easier to find while still leaving important histories out of sight. This study examines how archival collections can be reassembled and interpreted to challenge the assumptions built into conventional records. It raises questions about selection, classification, and the authority of the archive itself. Those questions matter whenever digital access is mistaken for a complete picture of the past.',
    href: 'https://www.nature.com/articles/s41599-024-02668-4',
  },
  {
    title: 'Why Are There Seven Sisters?',
    authors: 'Ray P. Norris and Barnaby R. M. Norris',
    year: '2021',
    publication: 'Advancing Cultural Astronomy',
    categoryId: 'mythology',
    intro:
      "Across widely separated cultures, stories about the Pleiades speak of seven sisters even though many observers distinguish only six bright stars. This study brings comparative mythology together with calculations of how the stars' apparent positions have changed over time. It explores the possibility that these traditions preserve an exceptionally ancient narrative. The hypothesis is provocative, but it remains a proposal rather than a demonstrated account of prehistoric storytelling.",
    href: 'https://arxiv.org/abs/2101.09170',
  },
  {
    title: 'A Large-Scale Study of World Myths',
    authors: 'Marc Thuillard, Jean-Loïc Le Quellec, Julien d’Huy, and Yuri Berezkin',
    year: '2018',
    publication: 'Trames',
    categoryId: 'mythology',
    intro:
      'Myths travel through languages, landscapes, and generations, acquiring new details while retaining recognizable patterns. This study approaches that complexity through a large-scale comparison of mythological motifs from different parts of the world. Instead of relying only on a handful of striking similarities, it asks what broader patterns can be detected across many traditions. The approach offers a way to examine cultural connections without assuming that resemblance alone proves a shared origin.',
    href: 'https://www.kirj.ee/public/trames_pdf/2018/issue_4/Trames-2018-4-407-424.pdf',
  },
  {
    title:
      'Creative Thought and the Divine Word: An Examination of the Mythological Expression of Cosmic Consciousness',
    authors: 'Merve Günaltay Başak and Aynur Koçak',
    year: '2026',
    publication: 'Religions',
    categoryId: 'mythology',
    intro:
      'How can a universe come into being through a thought, a word, or an act of naming? This comparative study follows such ideas across several mythological traditions and examines the role of consciousness and speech in creation narratives. The similarities are illuminating, but so are the differences in what each tradition understands by creation. The article provides a point of entry into the intellectual variety of mythic cosmologies.',
    href: 'https://www.mdpi.com/2077-1444/17/2/245',
  },
  {
    title: 'The Medieval Mappaemundi: Toward an Archaeology of Sacred Cartography',
    authors: 'Jon R. Stone',
    year: '1993',
    publication: 'Religion',
    categoryId: 'mythology',
    intro:
      'A medieval world map was not necessarily intended to provide the kind of geographic accuracy expected of a modern atlas. Its arrangement could also express sacred history, religious meaning, and an ordered vision of the cosmos. This article examines maps as cultural arguments about the shape and significance of the world. Looking at them this way reveals how cartography once joined geography with theology and collective memory.',
    href: 'https://www.sciencedirect.com/science/article/abs/pii/S0048721X83710195',
  },
  {
    title:
      'What “Counts” as Reliable Data? Nahua Science and the Tlapohualiztli (Reading) of Earth and Sky',
    authors: 'Kelly S. McDonough',
    year: '2026',
    publication: 'Tapuya',
    categoryId: 'mythology',
    intro:
      'What counts as evidence depends in part on how a community understands and observes the world. This article considers Nahua practices of reading signs in the earth and sky as part of an organized body of knowledge. It challenges the assumption that reliable observation must take the form of modern Western scientific categories. The result broadens the conversation about how societies record, interpret, and transmit knowledge.',
    href: 'https://www.tandfonline.com/doi/full/10.1080/25729861.2026.2651573',
  },
  {
    title: 'Observations of Red-Giant Variable Stars by Aboriginal Australians',
    authors: 'Duane W. Hamacher',
    year: '2018',
    publication: 'The Australian Journal of Anthropology',
    categoryId: 'mythology',
    intro:
      'Stars may seem fixed across a human lifetime, yet some change noticeably in brightness. This research investigates whether Aboriginal Australian traditions preserve observations of such variability in prominent red giant stars. It brings astronomical evidence into conversation with oral accounts and cultural interpretation. The case illustrates both the possibilities and the care required when studying scientific knowledge carried through storytelling.',
    href: 'https://minerva-access.unimelb.edu.au/server/api/core/bitstreams/f07595af-19f7-5977-b07f-df1f67a11b0d/content',
  },
  {
    title:
      'Cognitive Effects and Correlates of Reading Fiction: Two Preregistered Multilevel Meta-Analyses',
    authors: 'Lena Wimmer and colleagues',
    year: '2024',
    publication: 'Journal of Experimental Psychology: General',
    categoryId: 'reading',
    intro:
      'Does reading fiction change how people think, or do certain ways of thinking simply accompany a reading habit? Drawing on two preregistered meta-analyses, this study brings together evidence about fiction reading and cognitive or social-cognitive abilities. Its findings suggest generally small positive effects and associations rather than dramatic transformations. It offers a measured foundation for discussing what research can actually say about the benefits of fiction.',
    href: 'https://kar.kent.ac.uk/105137/',
  },
  {
    title: 'Reading for Pleasure and Attainment in Vocabulary and Mathematics',
    authors: 'Alice Sullivan and Matt Brown',
    year: '2015',
    publication: 'British Educational Research Journal',
    categoryId: 'reading',
    intro:
      'Reading for pleasure is often defended as an enriching habit, but its relationship to later learning can also be studied. This research uses longitudinal evidence to explore connections between recreational reading and subsequent performance in vocabulary and mathematics. By following development over time, it moves beyond a snapshot of who reads more. The findings invite discussion of literacy as part of a wider educational trajectory, without treating correlation as proof of causation.',
    href: 'https://doi.org/10.1002/berj.3180',
  },
  {
    title:
      'Shared Picture Book Reading Interventions for Child Language Development: A Systematic Review and Meta-Analysis',
    authors: 'Nicholas Dowdall and colleagues',
    year: '2020',
    publication: 'Child Development',
    categoryId: 'reading',
    intro:
      'Shared picture-book reading is a familiar part of early childhood, but how much difference do structured reading interventions make? This systematic review and meta-analysis brings together randomized trials examining language development. It looks beyond the appeal of the activity itself to evaluate measurable outcomes. The evidence is especially relevant to families, educators, and organizations designing accessible early-literacy programs.',
    href: 'https://academic.oup.com/chidev/article-abstract/91/2/e383/8258062',
  },
  {
    title: 'A Chapter a Day: Association of Book Reading with Longevity',
    authors: 'Avni Bavishi, Martin D. Slade, and Becca R. Levy',
    year: '2016',
    publication: 'Social Science & Medicine',
    categoryId: 'reading',
    intro:
      'Could a habit as ordinary as reading books be associated with longer life? This longitudinal observational study examines that question among older adults and reports an association between book reading and survival. The finding is intriguing because it places reading within a broader discussion of everyday habits and aging. It does not, however, establish that reading itself causes people to live longer.',
    href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5105607/',
  },
  {
    title: 'Reading Literary Fiction Improves Theory of Mind',
    authors: 'David Comer Kidd and Emanuele Castano',
    year: '2013',
    publication: 'Science',
    categoryId: 'reading',
    intro:
      'Can a brief encounter with literary fiction sharpen our ability to infer what other people think and feel? This influential experimental paper argues that it can, bringing literary form into the study of social cognition. The claim helped launch a wider debate about literature and empathy. It is best read alongside subsequent replication studies, which have not consistently reproduced the reported effect.',
    href: 'https://pubmed.ncbi.nlm.nih.gov/24091705/',
  },
  {
    title:
      'Does a Single Session of Reading Literary Fiction Prime Enhanced Mentalising Performance?',
    authors: 'Dalya Samur, Mattie Tops, and Sander L. Koole',
    year: '2018',
    publication: 'Cognition and Emotion',
    categoryId: 'reading',
    intro:
      "A compelling scientific claim becomes more useful when independent researchers try to reproduce it. This study revisits the proposal that a single session of literary-fiction reading can improve performance on tests of understanding others' mental states. Across several experiments, the researchers did not find the anticipated advantage. Its importance lies not in dismissing literature, but in showing why attractive explanations still require repeatable evidence.",
    href: 'https://www.tandfonline.com/doi/full/10.1080/02699931.2017.1279591',
  },
  {
    title:
      'Empathy and Perspective-Taking in Literary Fiction: A Systematic Review and Meta-Analysis of Psychological Evidence and Theoretical Insights',
    authors: 'Liu Chang',
    year: '2026',
    publication: 'Frontiers in Psychology',
    categoryId: 'reading',
    intro:
      'The relationship between literary fiction and empathy has attracted attention well beyond academic psychology. This systematic review and meta-analysis examines findings on empathy and perspective-taking while considering the theoretical explanations proposed for them. The reported evidence points to modest, context-dependent relationships rather than a universal effect. It provides a useful counterweight to simplified claims that reading any novel automatically makes us more empathetic.',
    href: 'https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2026.1865031/full',
  },
];
