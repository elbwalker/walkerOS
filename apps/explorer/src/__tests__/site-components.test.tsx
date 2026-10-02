import React from 'react';
import { render } from '@testing-library/react';
import { SiteButton, SectionHead } from '../site';

// Queries come from render(), not screen: the shared web jest setup replaces
// document.body before each test, which leaves screen bound to a stale body.
describe('site components', () => {
  it.each([
    ['link', { href: '/docs/' }],
    ['button', {}],
  ] as const)('SiteButton passes data attributes to the %s', (role, props) => {
    const { getByRole } = render(
      <SiteButton {...props} data-alstaction="click:docs">
        Docs
      </SiteButton>,
    );
    expect(getByRole(role, { name: 'Docs' })).toHaveAttribute(
      'data-alstaction',
      'click:docs',
    );
  });

  it('SectionHead renders children after the sub line', () => {
    const { getByText } = render(
      <SectionHead headline="Headline" sub="First paragraph">
        <p>Second paragraph</p>
      </SectionHead>,
    );
    const sub = getByText('First paragraph');
    const second = getByText('Second paragraph');
    expect(
      sub.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
