import React, { type AnchorHTMLAttributes } from 'react';
import { render } from '@testing-library/react';
import { Button } from '../Button';

// walkeros.io CTAs are tagged: a dropped data-elb attribute silently stops tracking.
const tagging = { 'data-elbaction': 'click:start', 'aria-label': 'Start' };

it.each([
  [
    'A',
    <Button href="/docs" {...tagging}>
      Start
    </Button>,
  ],
  ['BUTTON', <Button {...tagging}>Start</Button>],
])('<%s> carries the tagging attributes', (tagName, element) => {
  const root = render(element).container.firstElementChild;
  expect(root?.tagName).toBe(tagName);
  expect(root?.getAttribute('data-elbaction')).toBe('click:start');
  expect(root?.getAttribute('aria-label')).toBe('Start');
});

it('renders a provided link component with href, className and attributes', () => {
  function RouterLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
    return <a data-router="" {...props} />;
  }
  const { container } = render(
    <Button
      href="/docs"
      linkComponent={RouterLink}
      variant="secondary"
      data-elbaction="click:docs"
      arrow
    >
      Docs
    </Button>,
  );
  const root = container.firstElementChild;
  expect(root?.hasAttribute('data-router')).toBe(true);
  expect(root?.getAttribute('href')).toBe('/docs');
  expect(root?.getAttribute('class')).toBe('elb-btn elb-btn--secondary');
  expect(root?.getAttribute('data-elbaction')).toBe('click:docs');
  expect(root?.textContent).toBe('Docs →');
});

it.each([
  [
    'A',
    <Button href="/docs" arrow>
      Docs
    </Button>,
  ],
  ['BUTTON', <Button arrow>Next</Button>],
])('<%s> hides the arrow from screen readers', (_, element) => {
  const root = render(element).container.firstElementChild;
  expect(root?.querySelector('[aria-hidden="true"]')?.textContent).toBe(' →');
});
