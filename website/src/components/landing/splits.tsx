import React from 'react';
import {
  CodePanel,
  Panel,
  SectionHead,
  SplitSection,
} from '@walkeros/explorer/site';
import styles from './landing.module.css';
import { section } from './tag';

const SUB = 'elb-oa-section-head__sub';

const mappingCode = `// same event, three destinations, zero app code touched
{
  "destinations": {
    "ga4": {
      "config": { "mapping": { "product": { "view": { "name": "view_item" } } } }
    },
    "meta": {
      "config": { "mapping": { "product": { "view": { "name": "ViewContent" } } } }
    },
    "warehouse": {
      "config": { "mapping": { "product": { "view": { "name": "product_view" } } } }
    }
  }
}`;

const contractCode = `{
  "contract": {
    "default": {
      "events": {
        "order": {
          "complete": {
            "properties": {
              "data": { "required": ["total", "loyalty_tier"] }
            }
          }
        }
      }
    }
  }
}`;

function TagDemo() {
  return (
    <div className={styles['demo-panel']}>
      <div className={styles['demo-bar']}>
        <span className={styles['demo-dot']} />
        <span className={styles['demo-dot']} />
        <span className={styles['demo-dot']} />
        <span className={styles['demo-file']}>AddToCart.html</span>
      </div>
      <div className={styles['demo-body']}>
        <div className={styles['demo-code']}>
          <pre>
            <span className={styles['tok-tag']}>&lt;button</span>
            {'\n  '}
            <span className={styles['tok-attr']}>data-elb</span>=
            <span className={styles['tok-val']}>"product"</span>
            {'\n  '}
            <span className={styles['tok-attr']}>data-elb-product</span>=
            <span className={styles['tok-val']}>"name:Sneaker;price:89"</span>
            {'\n  '}
            <span className={styles['tok-attr']}>data-elbaction</span>=
            <span className={styles['tok-val']}>"click:add"</span>
            {'\n'}
            <span className={styles['tok-tag']}>&gt;</span>
            {'\n  '}
            <span className={styles['tok-text']}>Add to cart</span>
            {'\n'}
            <span className={styles['tok-tag']}>&lt;/button&gt;</span>
          </pre>
        </div>
        <div className={styles['demo-render']} aria-hidden="true">
          <div className={styles['demo-card']}>
            <div className={styles.thumb}>👟</div>
            <p className={styles.nm}>Sneaker</p>
            <p className={styles.pr}>€89</p>
            <button type="button" tabIndex={-1}>
              Add to cart
            </button>
          </div>
        </div>
      </div>
      <p className={`${styles.cap} ${styles['demo-cap']}`}>
        The attribute is part of the component's source, not a config maintained
        elsewhere. Ship the component once, and every click it captures reaches
        every destination, without anyone touching a tag manager.
      </p>
    </div>
  );
}

export default function Splits() {
  return (
    <>
      <SplitSection
        id="tagging"
        {...section('tagging')}
        text={
          <SectionHead
            kicker="Tracking lives in the component, not a separate step"
            headline="Tag a component once. Every instance is tracked, forever."
            sub={
              <>
                <b>The usual way:</b> whether it's a GTM click listener bound to
                a CSS class or a developer's own <code>dataLayer.push()</code>{' '}
                call, the trigger lives outside the component, added by hand,
                once, by whoever happened to build that feature. Rename the
                class, restructure the markup, or just forget the push on the
                next component, and nothing errors. The event simply stops
                arriving, or never starts, and it can take weeks before anyone
                traces a reporting gap back to a change in an unrelated PR.
              </>
            }
          >
            <p className={SUB}>
              <b>The walkerOS way:</b> <code>data-elb</code> attributes live
              directly in the markup, right where the component is built. Tag
              the button component once, and every place that component is used,
              on this page or the next hundred, is already tracked. No separate
              tagging pass, no drift between what ships and what's measured, no
              re-tagging when a component gets reused somewhere new.
            </p>
          </SectionHead>
        }
        panel={<TagDemo />}
      />

      <SplitSection
        id="event"
        {...section('event')}
        text={
          <SectionHead
            kicker="The vendor becomes a destination"
            headline="Instrument once. Every vendor is a mapping, not a rewrite."
            sub={
              <>
                <b>The usual way:</b> tracking code calls a vendor's SDK
                directly, in the exact shape that vendor expects. Switch
                vendors, and every call site gets rewritten, or you add another
                tag, trigger and variable to a GTM container that's already too
                full.
              </>
            }
          >
            <p className={SUB}>
              <b>The walkerOS way:</b> the app only ever emits one event, named
              with a strict <code>entity action</code> grammar. A destination
              config, not app code, maps it into GA4's shape, Meta's shape, or a
              warehouse row. Add a destination, drop one, or swap one out, and
              the app never changes.
            </p>
          </SectionHead>
        }
        panel={
          <CodePanel
            pairs={[
              { entity: 'product', action: 'view' },
              { entity: 'order', action: 'complete' },
              { entity: 'button', action: 'click' },
            ]}
            code={mappingCode}
            caption="40+ destination adapters ship with the project. Removing GA4 or adding a warehouse is a block in this file, not a re-instrumentation project across every page."
          />
        }
      />

      <SplitSection
        id="consent"
        {...section('consent')}
        text={
          <SectionHead
            kicker="Nothing leaves without your say"
            headline="Consent is checked before data ever moves."
            sub={
              <>
                <b>The usual way:</b> data leaves the browser for a Google-owned
                tag manager before anyone's consent choice is even in the
                picture, and compliance gets bolted on afterward as a separate
                layer, hoping it catches everything.
              </>
            }
          >
            <p className={SUB}>
              <b>The walkerOS way:</b> every mapping rule can carry its own
              consent requirement, checked before an event reaches a
              destination, as part of the config that defines the event in the
              first place.
            </p>
          </SectionHead>
        }
        panel={
          <Panel>
            <div className={styles.gate}>
              <span className={styles['gate-node']}>order complete</span>
              <span className={styles['gate-arrow']} />
              <span className={styles['gate-lock']}>consent: marketing?</span>
              <span className={styles['gate-arrow']} />
              <span className={styles['gate-node']}>Meta CAPI</span>
            </div>
            <p className={styles.cap}>
              Unresolved consent → the event queues or drops, per destination,
              per rule. Never a silent send.
            </p>
          </Panel>
        }
      />

      <SplitSection
        id="trace"
        {...section('trace')}
        text={
          <SectionHead
            kicker="One place to look, not three teams to ask"
            headline="The fields that matter to your business aren't in any vendor's schema."
            sub={
              <>
                <b>The usual way:</b> GA4 enforces its own required fields on{' '}
                <code>purchase</code>, but it has never heard of your loyalty
                tiers, your cost centers, or your internal deal IDs. Whoever
                owns the tag manager checks those by hand against a handwritten
                spec, page by page, release by release, and manual checks miss
                things at scale.
              </>
            }
          >
            <p className={SUB}>
              <b>The walkerOS way:</b> your own fields go in the same typed
              contract as the standard ones, required the same way and validated
              the same way. A pull request that leaves <code>loyalty_tier</code>{' '}
              out fails before it merges. No one has to remember to check.
            </p>
          </SectionHead>
        }
        panel={
          <CodePanel
            pairs={[{ entity: 'order', action: 'complete' }]}
            code={contractCode}
            caption={
              <>
                Frontend developers write the tagging against this file. Finance
                and analytics read reports from it. <code>loyalty_tier</code> is
                required here, and a validate step enforces it, replacing a
                manual check. Run <code>walkeros validate --strict</code> in CI,
                and a missing or misspelled field fails the build, not a report
                someone reads weeks later.
              </>
            }
          />
        }
      />
    </>
  );
}
