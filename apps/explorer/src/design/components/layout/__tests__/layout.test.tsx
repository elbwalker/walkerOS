import React from 'react';
import { render } from '@testing-library/react';
import { CardGrid } from '../CardGrid';
import { Cluster } from '../Cluster';
import { Section } from '../Section';
import { Split } from '../Split';

describe('Section', () => {
  it('wraps its children in the container and takes an id', () => {
    const root = render(
      <Section id="plans" tone="alt">
        <p>Body</p>
      </Section>,
    ).container.firstElementChild;
    expect(root?.tagName).toBe('SECTION');
    expect(root?.id).toBe('plans');
    expect(root?.getAttribute('class')).toBe('elb-section elb-section--alt');
    expect(root?.firstElementChild?.getAttribute('class')).toBe(
      'elb-section__inner',
    );
  });
});

describe('CardGrid', () => {
  it.each<[280 | 300 | 420 | 440, 'cards' | 'features' | undefined, string]>([
    [280, undefined, 'elb-card-grid elb-card-grid--min-280'],
    [
      300,
      'features',
      'elb-card-grid elb-card-grid--min-300 elb-card-grid--features',
    ],
  ])('min %s, gap %s', (min, gap, classes) => {
    const root = render(
      <CardGrid min={min} gap={gap}>
        <div />
      </CardGrid>,
    ).container.firstElementChild;
    expect(root?.getAttribute('class')).toBe(classes);
  });
});

describe('Split', () => {
  it('places start and end in that order', () => {
    const root = render(<Split variant="aside" start="Heading" end="List" />)
      .container.firstElementChild;
    expect(root?.getAttribute('class')).toBe('elb-split elb-split--aside');
    expect(
      Array.from(root?.children ?? [], (child) => [
        child.className,
        child.textContent,
      ]),
    ).toEqual([
      ['elb-split__start', 'Heading'],
      ['elb-split__end', 'List'],
    ]);
  });
});

describe('Cluster', () => {
  it('lays out a row of links, centred', () => {
    const root = render(
      <Cluster gap="links" align="center">
        <a href="#a">A</a>
      </Cluster>,
    ).container.firstElementChild;
    expect(root?.getAttribute('class')).toBe(
      'elb-cluster elb-cluster--links elb-cluster--center',
    );
  });

  it('sets a call to action apart from the content above', () => {
    const root = render(
      <Cluster align="center" separated>
        <a href="#a">A</a>
      </Cluster>,
    ).container.firstElementChild;
    expect(root?.getAttribute('class')).toBe(
      'elb-cluster elb-cluster--center elb-cluster--separated',
    );
  });
});
