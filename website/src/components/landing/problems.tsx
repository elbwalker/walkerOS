import React from 'react';
import { ProofGrid, SectionHead } from '@walkeros/explorer/site';
import styles from './landing.module.css';
import { section } from './tag';

const problems = [
  {
    claim: '1. Instrumentation never keeps up',
    witness:
      'Tagging is a separate task that follows shipping, usually owned by someone else. Every new component, every page, every redesign adds another round of manual setup, and a missing event looks exactly like a quiet afternoon.',
  },
  {
    claim: '2. A vendor switch means a rebuild',
    witness:
      "Tracking code is written against one vendor's exact shape. Switch vendors, and every call site gets rewritten, or another tag gets bolted onto a container that's already too full.",
  },
  {
    claim: '3. Compliance is checked after the fact',
    witness:
      "Data leaves the browser before anyone's consent choice is in the picture, and the compliance check that runs afterward may not catch everything.",
  },
  {
    claim: "4. Your own fields aren't in anyone's schema",
    witness:
      'Vendor schemas validate their own standard parameters, never the loyalty tier, cost center, or deal ID specific to your business. Whoever owns the tag manager ends up manually verifying those against a handwritten spec, page by page, release by release.',
  },
];

export default function Problems() {
  return (
    <section className={styles.story} id="why" {...section('problems')}>
      <SectionHead
        kicker="Because event instrumentation is real engineering effort"
        headline={
          <span className={styles.narrow}>
            Four problems every tracking setup runs into eventually.
          </span>
        }
      />
      <ProofGrid items={problems} />
    </section>
  );
}
