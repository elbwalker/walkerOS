import React from 'react';
import { SiteButton, ButtonRow } from '@walkeros/explorer/site';
import styles from './landing.module.css';
import { section, click } from './tag';

export default function Hero() {
  return (
    <header className={`${styles.wrap} ${styles.hero}`} {...section('hero')}>
      <p className={styles.kicker}>
        The tracking library you tried to build yourself
      </p>
      <h1>
        Tracking that ships <span>with the component.</span>
      </h1>
      <p className={styles.lede}>
        Tag it once in the markup, and every place that component gets reused is
        already tracked. No dataLayer call to remember, no click listener to
        wire up by hand, nothing to forget.
      </p>
      <ButtonRow>
        <SiteButton href="/docs/" {...click('docs')}>
          Read the docs
        </SiteButton>
        <SiteButton
          variant="secondary"
          href="https://calendar.app.google/cYWM716SigNPYrXZ8"
          {...click('demo')}
        >
          Schedule demo call
        </SiteButton>
      </ButtonRow>
      <p className={styles.facts}>
        <span>MIT licensed</span>
        <span>self-hostable</span>
        <span>TypeScript</span>
        <span>npm packages</span>
      </p>
    </header>
  );
}
