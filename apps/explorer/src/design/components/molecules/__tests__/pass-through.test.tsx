import React, { type ReactElement } from 'react';
import { BrowserFrame } from '../BrowserFrame';
import { CaseCard } from '../CaseCard';
import { CheckList } from '../CheckList';
import { FaqItem } from '../FaqItem';
import { FeatureItem } from '../FeatureItem';
import { HighlightCard } from '../HighlightCard';
import { PlanCard } from '../PlanCard';
import { ProblemCard } from '../ProblemCard';
import { SectionHeading } from '../SectionHeading';
import {
  PROBE,
  RouterLink,
  expectRootTagged,
  expectRoutedLink,
} from '../../__tests__/passThrough';

// walkeros.io tags sections, cards and CTAs through these attributes; a
// dropped one silently stops tracking.
it.each<[string, ReactElement, string]>([
  ['CheckList', <CheckList items={['A']} {...PROBE} />, 'ul'],
  [
    'BrowserFrame',
    <BrowserFrame url="https://demo.test" {...PROBE}>
      Page
    </BrowserFrame>,
    'div',
  ],
  ['SectionHeading', <SectionHeading title="T" {...PROBE} />, 'div'],
  [
    'ProblemCard',
    <ProblemCard number="01" title="T" {...PROBE}>
      Text
    </ProblemCard>,
    'div',
  ],
  [
    'FeatureItem',
    <FeatureItem title="T" {...PROBE}>
      Text
    </FeatureItem>,
    'div',
  ],
  [
    'FaqItem',
    <FaqItem question="Q" {...PROBE}>
      A
    </FaqItem>,
    'details',
  ],
  [
    'PlanCard',
    <PlanCard label="L" title="T" {...PROBE}>
      Text
    </PlanCard>,
    'div',
  ],
  [
    'CaseCard',
    <CaseCard label="L" title="T" stats={[]} {...PROBE}>
      Text
    </CaseCard>,
    'div',
  ],
  [
    'HighlightCard',
    <HighlightCard
      label="L"
      title="T"
      cta={{ label: 'Go', href: '/docs' }}
      {...PROBE}
    >
      Text
    </HighlightCard>,
    'div',
  ],
])(
  '%s passes every attribute it does not own to its root',
  (_name, element, tagName) => {
    expectRootTagged(element, tagName);
  },
);

it('FeatureItem passes linkAttributes to its routed link', () => {
  expectRoutedLink(
    <FeatureItem
      title="T"
      href="/docs"
      linkComponent={RouterLink}
      linkAttributes={PROBE}
    >
      Text
    </FeatureItem>,
    '/docs',
  );
});

// The CTA's own tagging rides on CallToAction.attributes.
it.each<[string, ReactElement]>([
  [
    'PlanCard',
    <PlanCard
      label="L"
      title="T"
      cta={{ label: 'Go', href: '/docs', attributes: PROBE }}
      linkComponent={RouterLink}
    >
      Text
    </PlanCard>,
  ],
  [
    'HighlightCard',
    <HighlightCard
      label="L"
      title="T"
      cta={{ label: 'Go', href: '/docs', attributes: PROBE }}
      linkComponent={RouterLink}
    >
      Text
    </HighlightCard>,
  ],
])(
  '%s renders its CTA through the link component with cta.attributes',
  (_name, element) => {
    expectRoutedLink(element, '/docs');
  },
);
