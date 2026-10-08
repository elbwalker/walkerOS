import Link from '@docusaurus/Link';
import {
  Section,
  SectionHeading,
  TextLink,
} from '@walkeros/explorer/design/components';
import { ROUTES, SECTION_ID } from './links';
import { actionTags, sectionTags } from './tags';
import styles from './GettingStarted.module.css';

const STEPS = [
  {
    title: 'Install the script',
    text: 'Add one script tag to every page, below your GTM snippet.',
  },
  {
    title: 'Tag your components',
    text: 'Name the entities, add their data, and say which actions count.',
  },
  {
    title: 'Get rich dataLayer pushes',
    text: 'Every interaction becomes one structured push, ready for GTM triggers.',
  },
];

/** Hand-drawn arrows between the steps: a wave, then a loop. */
const ARROWS = [
  {
    className: styles.arrowWave,
    paths: [
      'M4 26 C 18 6, 34 6, 40 20 S 58 34, 70 16',
      'M62 20 L70 16 L69.5 25',
    ],
  },
  {
    className: styles.arrowLoop,
    paths: [
      'M4 28 C 20 30, 26 8, 38 10 C 50 12, 44 28, 36 24 C 28 20, 44 6, 72 14',
      'M65.7 7.6 L72 14 L63.3 16.2',
    ],
  },
];

function Arrow({ className, paths }: (typeof ARROWS)[number]) {
  return (
    <li className={`${styles.arrow} ${className}`} aria-hidden="true">
      <svg
        width="76"
        height="40"
        viewBox="0 0 76 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </li>
  );
}

export default function GettingStartedSection() {
  return (
    <Section {...sectionTags('quickstart')} id={SECTION_ID.gettingStarted}>
      <SectionHeading
        eyebrow="Quickstart"
        title="From script tag to structured events in minutes."
        lead="No config, no build step. Works next to your existing Google Tag Manager setup."
      />
      <div className={styles.body}>
        <ol className={styles.steps}>
          {STEPS.flatMap((step, index) => {
            const item = (
              <li key={step.title} className={styles.step}>
                <div className={styles.stepHead}>
                  <span className={styles.num} aria-hidden="true">
                    {index + 1}
                  </span>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                </div>
                <p className={styles.stepCopy}>{step.text}</p>
              </li>
            );
            const arrow = ARROWS[index];
            return arrow
              ? [item, <Arrow key={`arrow-${index}`} {...arrow} />]
              : [item];
          })}
        </ol>
        <TextLink
          {...actionTags('guide')}
          href={ROUTES.walkerjs}
          arrow
          linkComponent={Link}
        >
          Read full quickstart guide
        </TextLink>
      </div>
    </Section>
  );
}
