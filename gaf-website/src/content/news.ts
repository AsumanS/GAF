export type NewsUpdate = {
  publishedOn: string;
  title: string;
  text: string;
  /** Phrases in `text` that link to another page. Match the visible phrase, without italic markers. */
  links?: { text: string; href: string }[];
};

/**
 * News & Updates.
 * Add a complete announcement here. Items are listed newest first.
 * Do not invent dates, headlines, or announcement text.
 */
export const newsContent = {
  metaDescription:
    'News and updates from Golden Archive Foundation about projects, publications, programs, and institutional announcements.',
  intro:
    'Follow the latest news from Golden Archive Foundation, including our projects, research, publications, and opportunities to get involved.',
  empty: 'There are no updates to show yet. New items will appear here as they are published.',
  items: [
    {
      publishedOn: '2026-10-16',
      title: 'Online Donations Now Available',
      text: `The online donation page is now open. A contribution may be made once, or each month, toward the Foundation's work in cultural preservation, historical research, and public education.`,
    },
    {
      publishedOn: '2026-10-05',
      title: 'Worlds Imagined Project Launched',
      text: `*Worlds Imagined* is a new initiative exploring the creative imagination and its expression in literature, art, and cultural heritage. Further developments will be shared as the work progresses.`,
      links: [{ text: 'Worlds Imagined', href: '/projects/worlds' }],
    },
    {
      publishedOn: '2026-09-30',
      title: 'Hidden Works Discovery Project Launched',
      text: `*Hidden Works* is devoted to identifying historically significant works that deserve renewed attention and wider accessibility. It invites the discovery of overlooked cultural and literary treasures.`,
      links: [{ text: 'Hidden Works', href: '/projects/hidden-works' }],
    },
    {
      publishedOn: '2026-09-29',
      title: 'Golden Archive Foundation Joins Facebook and Instagram',
      text: `Official pages are now open on Facebook and Instagram. Follow them for news of projects, research, publications, and ways to take part in preserving and sharing cultural heritage.`,
      links: [
        { text: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61595572550847' },
        { text: 'Instagram', href: 'https://www.instagram.com/goldenarchivefoundation/' },
      ],
    },
    {
      publishedOn: '2026-09-28',
      title: 'Volunteer Opportunities Now Open',
      text: `Volunteer applications are open. Anyone who wishes to give time or expertise to cultural preservation, research, education, or the Foundation's other activities is welcome to take part.`,
    },
    {
      publishedOn: '2026-09-26',
      title: 'Golden Archive Foundation Website Goes Live',
      text: `The official website is live. It is a home for the Foundation's work in cultural preservation, historical research, and public education, where visitors can read about the mission, explore the projects, and follow upcoming research and publications.`,
    },
  ] satisfies NewsUpdate[],
};

export function newsTextSegments(text: string): Array<{ text: string; italic: boolean }> {
  const segments: Array<{ text: string; italic: boolean }> = [];
  const pattern = /\*([^*]+)\*/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ text: text.slice(last, index), italic: false });
    segments.push({ text: match[1] ?? '', italic: true });
    last = index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), italic: false });
  return segments;
}

export function linkedParts(
  text: string,
  links: { text: string; href: string }[] = [],
): Array<{ text: string; href?: string }> {
  const usable = links.filter((link) => link.text && link.href);
  if (usable.length === 0) return [{ text }];
  const parts: Array<{ text: string; href?: string }> = [];
  let rest = text;
  while (rest.length > 0) {
    let earliest: { index: number; link: { text: string; href: string } } | null = null;
    for (const link of usable) {
      const index = rest.indexOf(link.text);
      if (index === -1) continue;
      if (
        !earliest ||
        index < earliest.index ||
        (index === earliest.index && link.text.length > earliest.link.text.length)
      ) {
        earliest = { index, link };
      }
    }
    if (!earliest) {
      parts.push({ text: rest });
      break;
    }
    if (earliest.index > 0) parts.push({ text: rest.slice(0, earliest.index) });
    parts.push({ text: earliest.link.text, href: earliest.link.href });
    rest = rest.slice(earliest.index + earliest.link.text.length);
  }
  return parts;
}

export function newsInDateOrder(items: NewsUpdate[]): NewsUpdate[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aDate = a.item.publishedOn.trim();
      const bDate = b.item.publishedOn.trim();
      if (aDate && bDate && aDate !== bDate) return bDate.localeCompare(aDate);
      if (aDate && !bDate) return -1;
      if (!aDate && bDate) return 1;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

export function formatNewsDate(iso: string): string {
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
