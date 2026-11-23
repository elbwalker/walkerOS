import React, { type ReactElement } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '@testing-library/react';
import { EndCard } from '../EndCard';
import { Slide } from '../Slide';
import { TitleCover } from '../TitleCover';

describe('TitleCover', () => {
  it('shows the title as the page heading, with eyebrow, subtitle and logo', () => {
    const { getByRole, getByText, getByTestId } = render(
      <TitleCover
        eyebrow="Quickstart"
        title="Tag a page"
        subtitle="One script tag, three attributes."
        logo={<svg data-testid="logo" />}
      />,
    );
    expect(getByRole('heading', { level: 1 }).textContent).toBe('Tag a page');
    expect(getByText('Quickstart')).toBeTruthy();
    expect(getByText('One script tag, three attributes.')).toBeTruthy();
    expect(getByTestId('logo')).toBeTruthy();
  });
});

describe('Slide', () => {
  it('shows the headline as a section heading and the body below it', () => {
    const { getByRole, getByText } = render(
      <Slide headline="Typed events" body="Every action is one event." />,
    );
    expect(getByRole('heading', { level: 2 }).textContent).toBe('Typed events');
    expect(getByText('Every action is one event.')).toBeTruthy();
  });

  it.each([
    ['without a visual, one column', undefined, 0],
    ['with a visual, a second column', <div key="v">Visual</div>, 1],
  ])('%s', (_name, visual, columns) => {
    const { container } = render(<Slide headline="H" visual={visual} />);
    expect(container.querySelectorAll('.elb-slide__visual')).toHaveLength(
      columns,
    );
  });
});

describe('EndCard', () => {
  it('shows the title as a section heading, the url as a link and the command to copy', () => {
    const { getByRole } = render(
      <EndCard
        title="Try it yourself"
        url="https://www.walkeros.io/docs"
        command="npm i @walkeros/cli"
      />,
    );
    expect(getByRole('heading', { level: 2 }).textContent).toBe(
      'Try it yourself',
    );
    expect(getByRole('link').getAttribute('href')).toBe(
      'https://www.walkeros.io/docs',
    );
    expect(
      getByRole('button', { name: /npm i @walkeros\/cli/ }).className,
    ).toContain('elb-cmd');
  });

  it('shows no command without one', () => {
    const { container } = render(
      <EndCard title="T" url="https://www.walkeros.io" />,
    );
    expect(container.querySelector('.elb-cmd')).toBeNull();
  });
});

// A full-frame part fills the scene or slide it is placed in and centres its
// content in both axes; the safe area is the section spacing.
describe('full-frame parts', () => {
  it.each<[string, ReactElement]>([
    ['TitleCover', <TitleCover key="cover" title="T" />],
    ['Slide', <Slide key="slide" headline="H" />],
    ['EndCard', <EndCard key="end" title="T" url="https://www.walkeros.io" />],
  ])('%s fills its parent and centres its content', (_name, element) => {
    expect(render(element).container.firstElementChild).toHaveClass(
      'elb-full-frame',
    );
  });

  it('the full-frame rule fills the parent and centres in both axes', () => {
    const sheet = readFileSync(
      resolve(
        __dirname,
        '../../../../styles/components/design/_full-frame.scss',
      ),
      'utf8',
    );
    const rule = /\.elb-full-frame\s*\{([^}]*)\}/.exec(sheet)?.[1] ?? '';
    const declarations = rule
      .split(';')
      .map((line) => line.trim())
      .filter(Boolean);
    expect(declarations).toEqual(
      expect.arrayContaining([
        'width: 100%',
        'height: 100%',
        'display: grid',
        'place-content: center',
        'padding: var(--section-y)',
      ]),
    );
  });
});
