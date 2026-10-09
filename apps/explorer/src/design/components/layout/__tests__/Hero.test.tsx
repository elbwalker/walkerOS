import React from 'react';
import { render } from '@testing-library/react';
import { Hero } from '../Hero';
import { PROBE, expectRootTagged } from '../../__tests__/passThrough';

describe('Hero', () => {
  it('stacks heading, actions, proof and the demo in that order', () => {
    const { container, getByRole } = render(
      <Hero
        eyebrow="The tracking library for design systems"
        title="User behavior tracking that ships"
        highlight="with your components."
        lead="Tag a component once."
        actions={<a href="#a">Action</a>}
        proof={<span>Proof</span>}
      >
        <div>Demo</div>
      </Hero>,
    );
    expect(container.firstElementChild?.tagName).toBe('SECTION');
    expect(getByRole('heading', { level: 1 }).textContent).toBe(
      'User behavior tracking that ships with your components.',
    );
    const inner = container.querySelector('.elb-hero__inner');
    expect(
      Array.from(inner?.children ?? [], (child) => child.className),
    ).toEqual([
      'elb-sh elb-sh--center',
      'elb-hero__actions',
      'elb-hero__proof',
      'elb-hero__demo',
    ]);
  });

  it('leaves out proof and demo when not given', () => {
    const { container } = render(
      <Hero eyebrow="E" title="T" lead="L" actions={<a href="#a">A</a>} />,
    );
    expect(container.querySelector('.elb-hero__proof')).toBeNull();
    expect(container.querySelector('.elb-hero__demo')).toBeNull();
  });

  it('passes every attribute it does not own to its root', () => {
    expectRootTagged(
      <Hero eyebrow="E" title="T" lead="L" actions="A" {...PROBE} />,
      'section',
    );
  });
});
