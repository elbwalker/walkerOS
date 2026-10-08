import React from 'react';
import { render } from '@testing-library/react';
import { Card, type CardProps } from '../Card';
import { Eyebrow, type EyebrowProps } from '../Eyebrow';
import { Icon, type IconName } from '../Icon';
import { Stat } from '../Stat';
import { Text, type TextProps } from '../Text';
import { TextLink } from '../TextLink';

describe('Icon', () => {
  it.each<[IconName, string]>([
    ['check', '0 0 16 16'],
    ['copy', '0 0 24 24'],
    ['warning', '0 0 24 24'],
  ])('%s is a hidden glyph on a %s grid', (name, viewBox) => {
    const svg = render(<Icon name={name} />).container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe(viewBox);
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('class')).toBe(`elb-icon elb-icon--${name}`);
    expect(svg?.getAttribute('width')).toBe('16');
  });

  it('takes a size', () => {
    const svg = render(<Icon name="check" size={32} />).container.querySelector(
      'svg',
    );
    expect(svg?.getAttribute('height')).toBe('32');
  });

  it('takes a label from the caller', () => {
    const svg = render(
      <Icon name="check" aria-hidden={false} aria-label="Included" />,
    ).container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('false');
    expect(svg?.getAttribute('aria-label')).toBe('Included');
  });
});

describe('Eyebrow', () => {
  it.each<[EyebrowProps['variant'], EyebrowProps['tone'], string]>([
    [undefined, undefined, 'elb-eyebrow'],
    ['label', 'muted', 'elb-eyebrow elb-eyebrow--label elb-eyebrow--muted'],
  ])('variant %s, tone %s', (variant, tone, classes) => {
    const root = render(
      <Eyebrow variant={variant} tone={tone}>
        Label
      </Eyebrow>,
    ).container.firstElementChild;
    expect(root?.tagName).toBe('P');
    expect(root?.getAttribute('class')).toBe(classes);
  });
});

describe('Stat', () => {
  it('shows its value above its label', () => {
    // The shared web setup swaps document.body per test, so `screen` would
    // query a detached body; the render's own queries follow the live one.
    const { getByText } = render(
      <Stat value="~50">components tagged once</Stat>,
    );
    expect(getByText('~50')).toHaveClass('elb-stat__value');
    expect(getByText('components tagged once')).toHaveClass('elb-stat__label');
  });
});

describe('Text', () => {
  it.each<[TextProps['size'], TextProps['tone'], string]>([
    [undefined, undefined, 'elb-text'],
    ['lg', 'fg', 'elb-text elb-text--lg elb-text--fg'],
  ])('size %s, tone %s', (size, tone, classes) => {
    const root = render(
      <Text size={size} tone={tone}>
        Copy
      </Text>,
    ).container.firstElementChild;
    expect(root?.tagName).toBe('P');
    expect(root?.getAttribute('class')).toBe(classes);
  });
});

describe('TextLink', () => {
  it('renders an anchor whose arrow screen readers skip', () => {
    const link = render(
      <TextLink href="/docs" tone="muted" arrow>
        Docs
      </TextLink>,
    ).container.firstElementChild;
    expect(link?.tagName).toBe('A');
    expect(link?.getAttribute('href')).toBe('/docs');
    expect(link?.getAttribute('class')).toBe(
      'elb-text-link elb-text-link--muted',
    );
    expect(link?.querySelector('[aria-hidden="true"]')?.textContent).toBe(' →');
  });
});

describe('Card', () => {
  it.each<[Omit<CardProps, 'children'>, string]>([
    [{}, 'elb-card elb-card--pad-md'],
    [
      { padding: 'lg', radius: 'xl', hover: true, highlight: true, glow: true },
      'elb-card elb-card--pad-lg elb-card--radius-xl elb-card--hover elb-card--highlight elb-card--glow',
    ],
  ])('%j', (props, classes) => {
    const root = render(<Card {...props}>Body</Card>).container
      .firstElementChild;
    expect(root?.getAttribute('class')).toBe(classes);
  });
});
