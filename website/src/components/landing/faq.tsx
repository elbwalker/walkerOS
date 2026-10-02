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
              trigger, so it overlaps with the job. As a collection layer it
              falls short in three ways. Nothing enforces a schema, so meaning
              lives in a variable-naming convention instead of a validated
              contract. Logic hides inside hand-written Custom HTML tags that
              the platform's own consent gate can't see into. And GTM is a
              router downstream of collection rather than a source of truth:
              something has to push structured data into <code>dataLayer</code>{' '}
              before GTM can act on it.
            </p>
            <p>
              Server-side GTM doesn't close that gap. It solves a different,
              real problem by moving tags off the browser onto infrastructure
              you control, past blockers and Safari's ITP. The framework
              underneath stays the same, with a tag, trigger, and variable per
              vendor, maintained by hand per page, only now on a server you run.
              walkerOS replaces that framework, and it can run alongside a
              server-side GTM container if you already have one.
            </p>
            <p>
              Some organizations rule out a Google-owned tag manager by policy.
              Others self-host on principle, so they don't have to add a new
              subprocessor to a DPA or send one to legal for review. walkerOS
              runs inside your own cloud, which settles both cases before they
              come up.
            </p>
            <p>
              GTM handles fan-out well enough that most teams never look past
              it, until the tag count, the missing contract, and the developer
              work of filling <code>dataLayer</code> by hand for every new event
              become the problem. That is the same dependency on developers GTM
              was supposed to remove.
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
              No. GTM becomes one destination among many instead of the
              collection layer itself, so it goes back to the one job it was
              built for, firing tags, and gets easier to work in.
              Point-and-click tag additions still work for marketing, wired off
              the same typed events.
            </p>
            <p>
              GTM no longer has to carry the collection logic: the custom
              scripts, hand-rolled consent checks, and schema hacks that pile up
              in a container once it's the only place data gets shaped. The
              container ends up smaller, with less code nobody wants to touch
              and more control over what's in it.
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
              reinvent the collection layer from scratch. walkerOS is
              self-hosted and MIT licensed, so it slots in as one component
              under an architecture you own, without tying you to a platform
              vendor.
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}
