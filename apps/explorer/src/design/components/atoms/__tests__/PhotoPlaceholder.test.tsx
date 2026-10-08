import React from 'react';
import { render } from '@testing-library/react';
import { PhotoPlaceholder } from '../PhotoPlaceholder';

describe('PhotoPlaceholder', () => {
  it('shows "photo" in the theme tone by default', () => {
    const root = render(<PhotoPlaceholder />).container.firstElementChild;
    expect(root?.tagName).toBe('DIV');
    expect(root?.textContent).toBe('photo');
    expect(root?.getAttribute('class')).toBe('elb-photo');
    expect(root?.hasAttribute('data-theme')).toBe(false);
  });

  it('takes a label, the viz tone and a class from the caller', () => {
    const root = render(
      <PhotoPlaceholder label="cover" tone="viz" className="card__photo" />,
    ).container.firstElementChild;
    expect(root?.textContent).toBe('cover');
    expect(root?.getAttribute('class')).toBe(
      'elb-photo elb-photo--viz card__photo',
    );
  });

  // The viz tokens resolve to their dark values on any page.
  it('makes the viz tone a dark island', () => {
    const root = render(<PhotoPlaceholder tone="viz" data-theme="light" />)
      .container.firstElementChild;
    expect(root?.getAttribute('data-theme')).toBe('dark');
  });

  it('keeps a theme the caller sets on the theme tone', () => {
    const root = render(<PhotoPlaceholder data-theme="light" />).container
      .firstElementChild;
    expect(root?.getAttribute('data-theme')).toBe('light');
  });

  // A stand-in image says nothing a reader needs, unless the caller names it.
  it('is decorative by default', () => {
    const root = render(<PhotoPlaceholder />).container.firstElementChild;
    expect(root?.getAttribute('aria-hidden')).toBe('true');
  });

  it.each<[string, Readonly<Record<string, string>>]>([
    ['role and aria-label', { role: 'img', 'aria-label': 'Cap' }],
    ['aria-labelledby', { 'aria-labelledby': 'cap-name' }],
  ])('is read once the caller names it (%s)', (_name, naming) => {
    const root = render(<PhotoPlaceholder {...naming} />).container
      .firstElementChild;
    expect(root?.hasAttribute('aria-hidden')).toBe(false);
    for (const [name, value] of Object.entries(naming))
      expect(root?.getAttribute(name)).toBe(value);
  });
});
