import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { Heading } from '../shared/atoms/Heading';
import { Link } from '../shared/atoms/Link';
import { Text } from '../shared/atoms/Text';
import { pageRoot } from './boot';

const entries = [
  {
    href: '/shop/',
    label: 'Shop',
    text: 'a one-page shop, from promotion to order, every section tagged.',
  },
  {
    href: '/media/',
    label: 'Media',
    text: 'a media library with a hero, carousels and a promotion.',
  },
  {
    href: '/storybook/',
    label: 'Storybook',
    text: 'every component of both demos with the events it sends.',
  },
];

// The list of demos. It runs no walkerOS; each demo page loads its own.
createRoot(pageRoot(document)).render(
  <StrictMode>
    <main className="mx-auto max-w-(--container) px-(--gutter) py-(--section-y)">
      <Heading level={1} variant="heading-lg">
        walkerOS demos
      </Heading>
      <Text className="mt-4">Example sites tagged with walkerOS.</Text>
      <ul className="mt-8 flex flex-col gap-3">
        {entries.map(({ href, label, text }) => (
          <li key={href}>
            <Link href={href} variant="link">
              {label}
            </Link>
            <Text as="span">: {text}</Text>
          </li>
        ))}
      </ul>
    </main>
  </StrictMode>,
);
