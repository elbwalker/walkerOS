import React from 'react';
import { SectionHead } from '@walkeros/explorer/site';
import styles from './landing.module.css';
import { click, section } from './tag';

const tiers = [
  {
    slug: 'self-hosted',
    for: 'community',
    name: 'Self-hosted',
    desc: 'Everything on this page, yours to clone, read, and run. Support comes from GitHub Discussions and the community around the project.',
    items: [
      'MIT licensed, no seat limits',
      'All sources, destinations, and transformers',
      'Community support, no response-time guarantee',
    ],
    cta: 'Start free',
    href: '/docs/getting-started/quickstart/',
  },
  {
    slug: 'implementation',
    for: 'fixed scope',
    name: 'Implementation',
    desc: 'A project rather than a subscription. We align your teams on what to measure and why, define the entity-action event model and mapping config, then build it with your team and hand over a pipeline your engineers own from day one.',
    items: [
      'Business questions mapped to entity action events',
      'Event model and mapping design for your stack',
      'Migration off an existing tag manager or CDP',
      'Custom source or destination builds',
    ],
    cta: 'Scope a project',
    href: 'https://www.elbwalker.com/services',
  },
  {
    slug: 'support',
    for: 'SLA',
    name: 'Support',
    desc: "A contract on top of the open-source project, for teams whose collector is on the critical path for revenue reporting or ad spend and can't run on best-effort community replies.",
    items: [
      'Guaranteed response times, direct access to elbwalker engineers',
      'Priority fixes and security patches',
      'Version and upgrade guidance for production flows',
    ],
    cta: 'Talk to us',
    href: 'mailto:hello@elbwalker.com',
    lead: true,
  },
];

export default function Plans() {
  return (
    <section className={styles.plans} id="plans" {...section('plans')}>
      <SectionHead
        className={styles['head-2']}
        kicker="Beyond the repo"
        headline="Run it yourself, or bring us in for the parts that need a team."
        sub="The software stays MIT licensed and self-hostable either way. These exist for the businesses that want a contract behind the pipeline their revenue reporting depends on."
      />
      <div className={styles.tiers}>
        {tiers.map((tier) => (
          <div
            key={tier.slug}
            className={
              tier.lead ? `${styles.tier} ${styles.lead}` : styles.tier
            }
          >
            <p className={styles.for}>{tier.for}</p>
            <p className={styles.nm}>{tier.name}</p>
            <p className={styles.d}>{tier.desc}</p>
            <ul>
              {tier.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <a
              className={styles.go}
              href={tier.href}
              {...click(`plan-${tier.slug}`)}
            >
              {tier.cta}
            </a>
          </div>
        ))}
      </div>
      <p className={styles.note}>
        No seat-based pricing on any tier: the software is the same MIT-licensed
        code whether you're on community or under contract.
      </p>
    </section>
  );
}
