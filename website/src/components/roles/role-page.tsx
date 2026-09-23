import React from 'react';
import Layout from '@theme/Layout';
import {
  ButtonRow,
  CodePanel,
  LimitsBlock,
  ProofGrid,
  SectionHead,
  SiteButton,
  SplitSection,
} from '@walkeros/explorer/site';
import landing from '@site/src/components/landing/landing.module.css';
import { click, section } from '@site/src/components/landing/tag';
import styles from './roles.module.css';
import { Rich } from './rich';
import { roleHref, roles, type RoleContent } from './roles';

export default function RolePage({ content }: { content: RoleContent }) {
  const role = roles.find((item) => item.slug === content.slug);
  const others = roles.filter((item) => item.slug !== content.slug);

  return (
    <Layout title={content.meta.title} description={content.meta.description}>
      <main className={landing.page}>
        <header
          className={`${landing.wrap} ${landing.hero}`}
          {...section('hero')}
        >
          <p className={landing.kicker}>
            walkerOS for {role ? role.title.toLowerCase() : content.slug}
          </p>
          <h1>{content.hero.headline}</h1>
          <p className={landing.lede}>
            <Rich text={content.hero.lede} />
          </p>
          <ButtonRow>
            <SiteButton href={content.hero.primary.href} {...click('primary')}>
              {content.hero.primary.label}
            </SiteButton>
            <SiteButton
              variant="secondary"
              href={content.hero.secondary.href}
              {...click('secondary')}
            >
              {content.hero.secondary.label}
            </SiteButton>
          </ButtonRow>
        </header>

        <div className={landing.wrap}>
          <section className={landing.story} {...section('situations')}>
            <SectionHead
              kicker="Sounds familiar"
              headline={content.situations.headline}
            />
            <ProofGrid
              items={content.situations.items.map((item) => ({
                claim: <Rich text={item.claim} />,
                witness: <Rich text={item.witness} />,
              }))}
            />
          </section>

          {content.changes.map((change, index) => (
            <SplitSection
              key={change.headline}
              {...section(`change-${index + 1}`)}
              text={
                <SectionHead
                  kicker={change.kicker}
                  headline={change.headline}
                  sub={<Rich text={change.body} />}
                />
              }
              panel={
                <CodePanel
                  code={change.code}
                  caption={<Rich text={change.caption} />}
                />
              }
            />
          ))}

          <section className={landing.story} {...section('fit')}>
            <SectionHead
              className={landing['head-2']}
              kicker="Where it fits"
              headline={content.fit.headline}
            />
            <div className={styles.fit}>
              <div>
                <h3>What stays</h3>
                <ul>
                  {content.fit.stays.map((item) => (
                    <li key={item}>
                      <Rich text={item} />
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>What changes</h3>
                <ul>
                  {content.fit.changes.map((item) => (
                    <li key={item}>
                      <Rich text={item} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className={styles.first}>
              <Rich text={content.fit.firstStep} />
            </p>
          </section>

          <section className={styles.limits} {...section('limits')}>
            <LimitsBlock
              heading="What walkerOS does not do for you"
              items={content.limits.map((item) => (
                <Rich key={item} text={item} />
              ))}
            />
          </section>
        </div>

        <section
          className={`${landing.wrap} ${landing.faq}`}
          {...section('questions')}
        >
          <SectionHead
            className={landing['head-2']}
            kicker="Questions"
            headline="Questions before you start"
          />
          <div className={landing['faq-list']}>
            {content.questions.map((item) => (
              <details key={item.question} className={landing['faq-item']}>
                <summary>{item.question}</summary>
                <div className={landing['faq-a']}>
                  <p>
                    <Rich text={item.answer} />
                  </p>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section
          className={`${landing.wrap} ${styles.next}`}
          {...section('next')}
        >
          <SectionHead
            className={landing['head-2']}
            kicker="Next steps"
            headline={content.next.headline}
          />
          <div className={styles.links}>
            {content.next.links.map((link) => (
              <a key={link.href} href={link.href} {...click('next')}>
                <strong>{link.label}</strong>
                <small>{link.note}</small>
              </a>
            ))}
          </div>
          <h2 className={`${landing.kicker} ${styles.others}`}>
            walkerOS for ...
          </h2>
          <div className={landing.whos} role="group" aria-label="walkerOS for">
            {others.map((other) => (
              <a
                key={other.slug}
                href={roleHref(other.slug)}
                {...click(`persona-${other.slug}`)}
              >
                <strong>{other.title}</strong>
                <small>{other.text}</small>
              </a>
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}
