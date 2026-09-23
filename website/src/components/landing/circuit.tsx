import React from 'react';
import { SectionHead } from '@walkeros/explorer/site';
import styles from './landing.module.css';
import { section } from './tag';

const stages = [
  {
    label: 'sources',
    name: 'Browser DOM · dataLayer · CMPs · server',
    desc: 'Where an interaction is captured: a click, a page view, a server-side call. Nothing is vendor-specific yet.',
  },
  {
    label: 'collector',
    name: 'Mapping · consent · routing',
    desc: 'The one place the event is defined, checked against consent, and given a shape, before it reaches anything downstream.',
    center: true,
  },
  {
    label: 'destinations',
    name: 'GA4 · Meta · your warehouse · your own API',
    desc: '40+ adapters ship with the project. Swapping one out takes a config entry, and the event that reaches it stays the same.',
  },
];

export default function Circuit() {
  return (
    <section className={styles.path} id="path" {...section('architecture')}>
      <SectionHead
        className={styles['head-2']}
        kicker="The architecture"
        headline="Three parts, with nothing hidden between them."
        sub="Every interaction becomes one typed event, once. What happens before and after is the whole system: where an event comes from, what it's allowed to carry, and where it's allowed to go."
      />
      <div
        className={styles.circuit}
        role="group"
        aria-label="Sources, collector, destinations"
      >
        {stages.map((stage, index) => (
          <React.Fragment key={stage.label}>
            {index > 0 ? (
              <div className={styles['circ-wire']} aria-hidden="true" />
            ) : null}
            <div
              className={
                stage.center
                  ? `${styles['circ-stage']} ${styles['circ-center']}`
                  : styles['circ-stage']
              }
            >
              <p className={styles['circ-label']}>{stage.label}</p>
              <p className={styles['circ-name']}>{stage.name}</p>
              <p className={styles['circ-desc']}>{stage.desc}</p>
            </div>
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
