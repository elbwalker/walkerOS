import { render } from '@testing-library/react';
import { testControls } from '../__fixtures__/controls';
import { elbAttributes } from '../__fixtures__/elbAttributes';
import { taggedElements } from '../__fixtures__/taggedElements';
import { elbish } from '../../shared/language';
import { promotion } from './data';
import { ShopPage } from './pages/ShopPage';

const page = (language: 'en' | 'elbish') => (
  <ShopPage controls={testControls({ language })} />
);

test('the language changes no tag but the language global', () => {
  const english = elbAttributes(page('en'));
  const elbishTags = elbAttributes(page('elbish'));

  expect(english).toContain('data-elbglobals=language:en');
  expect(elbishTags).toContain('data-elbglobals=language:elbish');
  expect(elbishTags).toEqual(
    english
      .map((pair) =>
        pair === 'data-elbglobals=language:en'
          ? 'data-elbglobals=language:elbish'
          : pair,
      )
      .sort(),
  );
});

test('a value read with #innerText follows the shown language', () => {
  const { container } = render(page('elbish'));
  const name = container.querySelector(
    '[data-elb-promotion="name:#innerText"]',
  );
  expect(name?.textContent).toBe(elbish(promotion.name));
});

test('the visible text changes', () => {
  const english = render(page('en')).container;
  const translated = render(page('elbish')).container;
  const headings = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('h2'), (h) => h.textContent);

  expect(headings(english)).toContain('Recommendations');
  expect(headings(translated)).toContain(elbish('Recommendations'));
  expect(headings(translated)).not.toContain('Recommendations');
});

// The site switches the language without a reload, and walker.js keeps the
// triggers it registered on the tagged elements: a toggle must not remount
// them.
test('a language toggle keeps every tagged element', () => {
  const { container, rerender } = render(page('en'));
  const before = taggedElements(container);
  expect(before.length).toBeGreaterThan(0);

  rerender(page('elbish'));
  const after = taggedElements(container);

  expect(after).toHaveLength(before.length);
  after.forEach((element, index) => expect(element).toBe(before[index]));
});
