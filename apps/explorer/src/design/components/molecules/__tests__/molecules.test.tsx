import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { CaseCard } from '../CaseCard';
import { CheckList } from '../CheckList';
import { FaqItem } from '../FaqItem';
import { FeatureItem } from '../FeatureItem';
import { HighlightCard } from '../HighlightCard';
import { PlanCard } from '../PlanCard';
import { ProblemCard } from '../ProblemCard';
import { SectionHeading } from '../SectionHeading';
import { Icon } from '../../atoms/Icon';

describe('CheckList', () => {
  it('leads each item with a check, 14px when stacked', () => {
    const { container } = render(
      <CheckList
        items={['MIT licensed', 'Community support']}
        layout="stack"
      />,
    );
    const list = container.firstElementChild;
    expect(list?.getAttribute('class')).toBe(
      'elb-checklist elb-checklist--stack',
    );
    const items = Array.from(list?.querySelectorAll('li') ?? []);
    expect(items.map((item) => item.textContent)).toEqual([
      'MIT licensed',
      'Community support',
    ]);
    expect(items[0]?.querySelector('svg')?.getAttribute('width')).toBe('14');
  });

  it('centres an inline list with 16px checks', () => {
    const { container } = render(<CheckList items={['A']} align="center" />);
    expect(container.firstElementChild?.getAttribute('class')).toBe(
      'elb-checklist elb-checklist--center',
    );
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('16');
  });
});

describe('SectionHeading', () => {
  it('renders eyebrow, h2 and lead for a section', () => {
    const { getByRole, getByText } = render(
      <SectionHeading
        eyebrow="FAQ"
        title="Questions we actually get."
        lead="Lead"
        size="md"
      />,
    );
    expect(getByRole('heading', { level: 2 })).toHaveClass(
      'elb-sh__title',
      'elb-sh__title--md',
    );
    expect(getByText('FAQ')).toHaveClass('elb-eyebrow');
    expect(getByText('Lead')).toHaveClass('elb-sh__lead');
  });

  it('renders the hero h1 centred, with its highlight', () => {
    const { container, getByRole, getByText } = render(
      <SectionHeading
        level={1}
        title="User behavior tracking that ships"
        highlight="with your components."
        lead="Lead"
      />,
    );
    expect(container.firstElementChild).toHaveClass('elb-sh', 'elb-sh--center');
    const heading = getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe(
      'User behavior tracking that ships with your components.',
    );
    expect(getByText('with your components.')).toHaveClass('elb-sh__highlight');
    expect(getByText('Lead')).toHaveClass('elb-sh__lead', 'elb-sh__lead--hero');
  });
});

describe('ProblemCard', () => {
  it('numbers its title on a hover card', () => {
    const { container, getByRole, getByText } = render(
      <ProblemCard number="01" title="Every feature needs a tracking ticket">
        Text
      </ProblemCard>,
    );
    expect(container.firstElementChild?.getAttribute('class')).toBe(
      'elb-card elb-card--pad-sm elb-card--hover elb-problem-card',
    );
    expect(getByRole('heading', { level: 3 }).textContent).toBe(
      '01Every feature needs a tracking ticket',
    );
    expect(getByText('01')).toHaveClass('elb-problem-card__number');
  });
});

describe('FeatureItem', () => {
  it('links to its docs with an arrow', () => {
    const { getByRole } = render(
      <FeatureItem title="Consent handling" href="/docs/guides/consent">
        Text
      </FeatureItem>,
    );
    const link = getByRole('link');
    expect(link.getAttribute('href')).toBe('/docs/guides/consent');
    expect(link.textContent).toBe('Docs →');
    expect(link).toHaveClass('elb-text-link', 'elb-feature__link');
  });

  it('shows no link without href', () => {
    const { queryByRole } = render(
      <FeatureItem title="Session detection">Text</FeatureItem>,
    );
    expect(queryByRole('link')).toBeNull();
  });
});

describe('FaqItem', () => {
  it('opens on its summary and renders each string child as a paragraph', () => {
    const { container, getByText } = render(
      <FaqItem question="Can't we just keep using Google Tag Manager?">
        {['Yes, as a destination.', 'No. GTM keeps working for marketing.']}
      </FaqItem>,
    );
    const details = container.querySelector('details');
    expect(details).toHaveClass('elb-faq');
    expect(details?.open).toBe(false);
    fireEvent.click(getByText("Can't we just keep using Google Tag Manager?"));
    expect(details?.open).toBe(true);
    expect(
      Array.from(
        container.querySelectorAll('.elb-faq__answer > p'),
        (p) => p.textContent,
      ),
    ).toEqual([
      'Yes, as a destination.',
      'No. GTM keeps working for marketing.',
    ]);
  });

  it('starts open when asked', () => {
    const { container } = render(
      <FaqItem question="Q" open>
        A
      </FaqItem>,
    );
    expect(container.querySelector('details')?.open).toBe(true);
  });
});

describe('PlanCard', () => {
  const props = {
    label: 'SLA',
    title: 'Support',
    features: ['Priority fixes and security patches'],
    cta: { label: 'Talk to us', href: 'https://example.com/talk' },
  };

  it('highlighted: primary CTA, ring, link-coloured label', () => {
    const { container, getByRole, getByText } = render(
      <PlanCard {...props} highlight>
        Text
      </PlanCard>,
    );
    expect(container.firstElementChild).toHaveClass(
      'elb-card--highlight',
      'elb-plan',
    );
    expect(getByText('SLA')).toHaveClass('elb-eyebrow', 'elb-eyebrow--label');
    expect(getByText('SLA')).not.toHaveClass('elb-eyebrow--muted');
    const cta = getByRole('link', { name: 'Talk to us' });
    expect(cta).toHaveClass('elb-btn--primary', 'elb-btn--block');
    expect(cta.getAttribute('href')).toBe('https://example.com/talk');
    expect(
      getByText('Priority fixes and security patches').closest('ul'),
    ).toHaveClass('elb-checklist--stack');
  });

  it('plain: secondary CTA and a muted label', () => {
    const { container, getByRole, getByText } = render(
      <PlanCard {...props}>Text</PlanCard>,
    );
    expect(container.firstElementChild).not.toHaveClass('elb-card--highlight');
    expect(getByText('SLA')).toHaveClass('elb-eyebrow--muted');
    expect(getByRole('link', { name: 'Talk to us' })).toHaveClass(
      'elb-btn--secondary',
    );
  });
});

describe('CaseCard', () => {
  it('lays out its own stat tiles', () => {
    const { container } = render(
      <CaseCard
        label="Media"
        title="One design system."
        stats={[
          { value: '~50', label: 'components tagged once' },
          {
            value: <Icon name="check" size={32} />,
            label: 'Data the analytics team can trust',
          },
        ]}
      >
        Text
      </CaseCard>,
    );
    const stats = container.querySelector('.elb-case-card__stats');
    expect(stats?.children).toHaveLength(2);
    expect(stats?.firstElementChild).toHaveClass('elb-stat');
    expect(stats?.querySelector('svg')?.getAttribute('width')).toBe('32');
    expect(container.querySelector('.elb-card-grid')).toBeNull();
  });
});

describe('HighlightCard', () => {
  it('is a large glowing card with a secondary arrow CTA', () => {
    const { container, getByRole } = render(
      <HighlightCard
        label="Raw data"
        title="Own your analytics data."
        cta={{
          label: 'Explore warehouse destinations',
          href: '/docs/destinations/server/gcp',
        }}
      >
        Text
      </HighlightCard>,
    );
    expect(container.firstElementChild?.getAttribute('class')).toBe(
      'elb-card elb-card--pad-lg elb-card--radius-xl elb-card--hover elb-card--glow elb-highlight-card',
    );
    const cta = getByRole('link');
    expect(cta).toHaveClass(
      'elb-btn',
      'elb-btn--secondary',
      'elb-highlight-card__cta',
    );
    expect(cta.textContent).toBe('Explore warehouse destinations →');
  });
});
