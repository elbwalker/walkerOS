import React from 'react';
import styles from './landing.module.css';
import { click, section } from './tag';

const personas = [
  {
    slug: 'tracking-specialists',
    title: 'Tracking specialists',
    text: 'Coming from GTM & GA4: a direct translation',
    href: '/docs/comparisons/gtm/',
  },
  {
    slug: 'developers',
    title: 'Developers',
    text: 'API, types, and how the pipeline is actually built',
    href: '/docs/getting-started/',
  },
  {
    slug: 'data-analysts',
    title: 'Data analysts',
    text: 'Trustworthy events, from the warehouse backward',
    href: '/docs/destinations/server/gcp/',
  },
  {
    slug: 'data-leads',
    title: 'Data leads',
    text: 'One schema that survives the handoff between silos',
    href: '/docs/getting-started/flow/contract/',
  },
];

export default function Personas() {
  return (
    <section className={styles.who} {...section('personas')}>
      <h2 className={styles.kicker}>walkerOS for ...</h2>
      <div className={styles.whos} role="group" aria-label="walkerOS for">
        {personas.map((persona) => (
          <a
            key={persona.slug}
            href={persona.href}
            {...click(`persona-${persona.slug}`)}
          >
            <strong>{persona.title}</strong>
            <small>{persona.text}</small>
          </a>
        ))}
      </div>
    </section>
  );
}
