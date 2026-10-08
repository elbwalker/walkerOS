import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { BrowserFrame } from '../BrowserFrame';

const BOOKMARKS = [
  { label: 'Shop', url: 'https://demo.test/shop' },
  { label: 'Media', url: 'https://demo.test/media' },
];

describe('BrowserFrame', () => {
  it('shows the url as text in the address field', () => {
    const { getByText, queryByRole } = render(
      <BrowserFrame url="https://demo.test/shop">Page</BrowserFrame>,
    );
    expect(getByText('https://demo.test/shop')).toHaveClass('elb-browser__url');
    // Read-only: no text box to type into.
    expect(queryByRole('textbox')).toBeNull();
  });

  it('puts the children in the viewport', () => {
    const { getByText } = render(
      <BrowserFrame url="https://demo.test/shop">
        <p>Page</p>
      </BrowserFrame>,
    );
    expect(getByText('Page').parentElement).toHaveClass(
      'elb-browser__viewport',
    );
  });

  it('has no bookmarks row without bookmarks', () => {
    const { container } = render(
      <BrowserFrame url="https://demo.test/shop">Page</BrowserFrame>,
    );
    expect(container.querySelector('.elb-browser__bookmarks')).toBeNull();
  });

  it('marks the bookmark of the current url', () => {
    const { getByRole } = render(
      <BrowserFrame url="https://demo.test/media" bookmarks={BOOKMARKS}>
        Page
      </BrowserFrame>,
    );
    const media = getByRole('button', { name: 'Media' });
    expect(media).toHaveAttribute('aria-current', 'page');
    expect(media).toHaveClass('elb-browser__bookmark--active');
    const shop = getByRole('button', { name: 'Shop' });
    expect(shop).not.toHaveAttribute('aria-current');
    expect(shop).not.toHaveClass('elb-browser__bookmark--active');
  });

  it('navigates to a bookmark on click', () => {
    const onNavigate = jest.fn();
    const { getByRole } = render(
      <BrowserFrame
        url="https://demo.test/shop"
        bookmarks={BOOKMARKS}
        onNavigate={onNavigate}
      >
        Page
      </BrowserFrame>,
    );
    fireEvent.click(getByRole('button', { name: 'Media' }));
    expect(onNavigate).toHaveBeenCalledWith('https://demo.test/media');
  });

  it('disables the bookmarks without onNavigate', () => {
    const { getByRole } = render(
      <BrowserFrame url="https://demo.test/shop" bookmarks={BOOKMARKS}>
        Page
      </BrowserFrame>,
    );
    expect(getByRole('button', { name: 'Media' })).toBeDisabled();
  });

  it('keeps the bookmarks enabled with onNavigate', () => {
    const { getByRole } = render(
      <BrowserFrame
        url="https://demo.test/shop"
        bookmarks={BOOKMARKS}
        onNavigate={() => {}}
      >
        Page
      </BrowserFrame>,
    );
    expect(getByRole('button', { name: 'Media' })).toBeEnabled();
  });

  it('puts the actions at the end of the address bar, after reload', () => {
    const { getByRole } = render(
      <BrowserFrame
        url="https://demo.test/shop"
        onReload={() => {}}
        actions={
          <button type="button" aria-label="Tag Mode">
            w
          </button>
        }
      >
        Page
      </BrowserFrame>,
    );
    const action = getByRole('button', { name: 'Tag Mode' });
    const slot = action.parentElement;
    expect(slot).toHaveClass('elb-browser__actions');
    expect(slot?.parentElement).toHaveClass('elb-browser__bar');
    expect(slot?.previousElementSibling).toBe(
      getByRole('button', { name: 'Reload' }),
    );
  });

  it('has no actions slot without actions', () => {
    const { container } = render(
      <BrowserFrame url="https://demo.test/shop">Page</BrowserFrame>,
    );
    expect(container.querySelector('.elb-browser__actions')).toBeNull();
  });

  it('has a reload button only with onReload, and it calls it', () => {
    const plain = render(
      <BrowserFrame url="https://demo.test/shop">Page</BrowserFrame>,
    );
    expect(plain.queryByRole('button', { name: 'Reload' })).toBeNull();
    plain.unmount();

    const onReload = jest.fn();
    const { getByRole } = render(
      <BrowserFrame url="https://demo.test/shop" onReload={onReload}>
        Page
      </BrowserFrame>,
    );
    fireEvent.click(getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
