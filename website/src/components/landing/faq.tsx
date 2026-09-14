import React from 'react';
import { SectionHead } from '@walkeros/explorer/site';
import styles from './landing.module.css';
import { section } from './tag';

export default function Faq() {
  return (
    <section
      className={`${styles.wrap} ${styles.faq}`}
      id="faq"
      {...section('faq')}
    >
      <SectionHead
        className={styles['head-2']}
        kicker="FAQ"
        headline="Questions we actually get."
      />
      <div className={styles['faq-list']}>
        <details className={styles['faq-item']}>
          <summary>Can't I just do this with Google Tag Manager?</summary>
          <div className={styles['faq-a']}>
            <p>
              GTM fans one event out to many vendor tags and has a consent
              trigger, so it overlaps with the job. It doesn't hold up as a
              collection layer under scrutiny: no enforced schema (meaning lives
              in variable-naming convention, not a validated contract), logic
              hidden inside hand-written Custom HTML tags the platform's own
              consent gate can't see into, and it's a router sitting downstream
              of collection, not a source of truth. Something has to already
              push structured data into <code>dataLayer</code> before GTM can
              act on it.
            </p>
            <p>
              Server-side GTM doesn't close the gap either. It solves a real,
              different problem: moving tags off the browser, onto
              infrastructure you control, past blockers and Safari's ITP. But
              the framework underneath is unchanged, still a tag, trigger, and
              variable per vendor, still hand-maintained per page, just
              relocated to a server you now run. walkerOS replaces the framework
              itself, not just where it executes, and can sit alongside a
              server-side GTM container if one's already in place.
            </p>
            <p>
              For some organizations a Google-owned tag manager is ruled out by
              policy, full stop, not a preference to weigh. Others self-host on
              principle, so there's no new subprocessor to add to a DPA or send
              to legal for review. walkerOS runs inside your own cloud either
              way, so the decision is answered before it needs to be made.
            </p>
            <p>
              Honest caveat: GTM genuinely solves fan-out well enough that most
              teams never look past it, until the tag count, the missing
              contract, and the dev work of hand-filling <code>dataLayer</code>{' '}
              for every new event become the actual problem. That's the exact
              dependency on developers GTM was supposed to remove.
            </p>
          </div>
        </details>
        <details className={styles['faq-item']}>
          <summary>
            If we move collection to walkerOS, don't we lose the visual
            point-and-click tagging marketing uses?
          </summary>
          <div className={styles['faq-a']}>
            <p>
              No, and GTM gets easier to work in, not harder. It becomes one
              destination among many instead of the collection layer itself, so
              it goes back to doing the one job it was built for: firing tags.
              Point-and-click tag additions still work for marketing, wired off
              the same typed events.
            </p>
            <p>
              What it stops being asked to do is carry the collection logic: the
              custom scripts, hand-rolled consent checks, and schema hacks that
              pile up in a container once it's the only place data gets shaped.
              Less bloat, less code nobody wants to touch, more control over
              what's actually in there.
            </p>
          </div>
        </details>
        <details className={styles['faq-item']}>
          <summary>
            We want to build a tracking library in-house. Why would we adopt
            this instead?
          </summary>
          <div className={styles['faq-a']}>
            <p>
              Because adopting walkerOS doesn't ask you to stop building. Teams
              that build their own measurement platform still don't want to
              reinvent the collection layer from scratch. Self-hosted,
              MIT-licensed, no vendor lock-in, so it slots in as one component
              under an architecture you own, not a platform relationship you're
              locked into.
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}
