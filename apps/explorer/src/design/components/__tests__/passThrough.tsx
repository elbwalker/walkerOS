import React, { type AnchorHTMLAttributes, type ReactElement } from 'react';
import { render } from '@testing-library/react';

/** Tagging and accessibility attributes every design component passes on. */
export const PROBE: Readonly<Record<string, string>> = {
  'data-alst': 'probe',
  'data-alstaction': 'click:probe',
  'aria-label': 'Probe label',
};

/** A router link stand-in that marks the anchor it renders. */
export function RouterLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a data-router="" {...props} />;
}

/** The rendered root is `tagName` and carries every PROBE attribute. */
export function expectRootTagged(element: ReactElement, tagName: string): void {
  const root = render(element).container.firstElementChild;
  expect(root?.tagName.toLowerCase()).toBe(tagName);
  for (const [name, value] of Object.entries(PROBE))
    expect(root?.getAttribute(name)).toBe(value);
}

/** The link inside is RouterLink's, with `href` and every PROBE attribute. */
export function expectRoutedLink(element: ReactElement, href: string): void {
  const link = render(element).container.querySelector('a[data-router]');
  expect(link?.getAttribute('href')).toBe(href);
  for (const [name, value] of Object.entries(PROBE))
    expect(link?.getAttribute(name)).toBe(value);
}
