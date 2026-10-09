// The media site's content: its sections, their titles and the rows the
// "Add row" button appends.

import type { NavLink } from '../../shared/molecules/NavLinks';
import type { FooterLink } from '../../shared/organisms/Footer';

export interface MediaItem {
  title: string;
  alt?: string;
}

export interface MediaRow {
  title: string;
  items: MediaItem[];
}

/** The header's links, each to a section of the page. */
export const navLinks: NavLink[] = [
  { label: 'Series', href: '#series' },
  { label: 'Movies', href: '#films' },
  { label: 'Documentaries', href: '#documentaries' },
  { label: 'Kids', href: '#promotion' },
];

export const hero = {
  title: 'Life in Code',
  subtitle: 'Balancing Passion and Work',
  buttonText: 'Explore Now',
  style: 5,
};

export const topSeries: MediaRow = {
  title: 'Our Top Series',
  items: [
    { title: 'Debugging Dreams' },
    { title: 'Return of the Bug' },
    { title: 'Code Wars' },
    { title: 'Data Diaries' },
    { title: 'Sleepless in Stack Overflow' },
  ],
};

export const filmRecommendations: MediaRow = {
  title: 'Movie Recommendations',
  items: [
    { title: 'Inside Server-Side Valley' },
    { title: 'A Beautiful Code' },
    { title: 'The Art of Refactoring' },
    { title: 'The Pragmatic Programmer' },
    { title: 'A Journey into Agile' },
  ],
};

export const promotion = {
  headline: 'Activate Kids Mode',
  subtitle: 'Create a safe space for younger viewers.',
  buttonText: 'Activate Now',
};

export const documentaries: MediaRow = {
  title: 'Exciting Documentaries and Reports',
  items: [
    { title: 'The Future of Tech' },
    { title: 'AI Revolution' },
    { title: 'Open Source Stories' },
    { title: 'Digital Transformation' },
  ],
};

// Rows appended at runtime by the "Add row" button. Cycled so repeated clicks
// keep producing fresh, tagged content.
export const extraRows: MediaRow[] = [
  {
    title: 'Trending Now',
    items: [
      { title: 'The Nightly Build' },
      { title: 'Merge Conflict' },
      { title: 'Ship It' },
      { title: 'Rubber Duck Tales' },
    ],
  },
  {
    title: 'New Releases',
    items: [
      { title: 'Null and Void' },
      { title: 'The Big O' },
      { title: 'Race Condition' },
      { title: 'Off By One' },
    ],
  },
  {
    title: 'Because You Watched',
    items: [
      { title: 'Kernel Panic' },
      { title: 'The Legacy System' },
      { title: 'Hotfix Heroes' },
      { title: 'Semver Saga' },
    ],
  },
];

// The demo's footer links lead nowhere.
export const footerLinks: FooterLink[] = [
  'About',
  'Help',
  'Kids Mode',
  'Imprint',
].map((label) => ({ label, href: '#' }));

export const copyright = '© 2024 Media Platform. All rights reserved.';
