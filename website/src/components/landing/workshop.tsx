import React from 'react';
import { Badge, SiteButton } from '@walkeros/explorer/site';
import styles from './landing.module.css';
import { click, section } from './tag';

export default function Workshop() {
  return (
    <section className={styles.promo} id="workshop" {...section('workshop')}>
      <div className={styles['promo-in']}>
        <div>
          <Badge>Live workshop · free</Badge>
          <h3>Tag a real website, live, in the browser.</h3>
          <p>
            One hour, one real page, tagged live in the Tag Mode extension.
            Entity and action, properties off the DOM, context that bubbles,
            globals that don't: the mental model, not the diagram version.
          </p>
          <p className={styles.when}>
            60 min (45 + Q&amp;A) · free · live, not recorded · bring your own
            page · Wednesday 10:00 CEST, date TBD, registrants are notified
            first
          </p>
        </div>
        <SiteButton
          href="mailto:hello@elbwalker.com?subject=Workshop%3A%20save%20my%20seat"
          {...click('workshop')}
        >
          Save your seat
        </SiteButton>
      </div>
    </section>
  );
}
