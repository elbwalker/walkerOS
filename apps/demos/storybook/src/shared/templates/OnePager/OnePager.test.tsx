import { fireEvent, render } from '@testing-library/react';
import { Link } from '../../atoms/Link';
import { OnePager } from './OnePager';

const rect = (top: number, height: number): DOMRect => ({
  x: 0,
  y: top,
  top,
  bottom: top + height,
  left: 0,
  right: 100,
  width: 100,
  height,
  toJSON: () => ({}),
});

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('missing');
  return value;
}

// jsdom implements neither: a recording function for each (window.scrollTo
// is the page's own window, not a collector).
const originalScrollIntoView = Element.prototype.scrollIntoView;
const scrollIntoView = jest.fn();
let scrollTo: jest.SpyInstance;

beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
  scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

const renderPage = () =>
  render(
    <OnePager
      header={
        <header>
          <a href="#second">Second</a>
          <a href="#">Top</a>
          <Link href="#">Leads nowhere</Link>
        </header>
      }
      footer={<footer />}
    >
      <section id="first">First</section>
      <section id="second">Second section</section>
    </OnePager>,
  );

test('an anchor scrolls the page window to its section, below the sticky header', () => {
  const { getByText, container } = renderPage();
  const header = required(container.querySelector('header')?.parentElement);
  jest.spyOn(header, 'getBoundingClientRect').mockReturnValue(rect(0, 64));
  jest
    .spyOn(
      required(container.ownerDocument.getElementById('second')),
      'getBoundingClientRect',
    )
    .mockReturnValue(rect(500, 300));

  const notPrevented = fireEvent.click(getByText('Second'));

  expect(notPrevented).toBe(false);
  expect(scrollTo).toHaveBeenCalledTimes(1);
  expect(scrollTo).toHaveBeenCalledWith({ top: 436, behavior: 'smooth' });
  expect(scrollIntoView).not.toHaveBeenCalled();
  expect(window.location.hash).toBe('#second');
});

test('# alone scrolls to the top', () => {
  const { getByText } = renderPage();

  expect(fireEvent.click(getByText('Top'))).toBe(false);

  expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  expect(scrollIntoView).not.toHaveBeenCalled();
});

test('a link that handles its own click keeps the reader where they are', () => {
  const { getByText } = renderPage();

  fireEvent.click(getByText('Leads nowhere'));

  expect(scrollTo).not.toHaveBeenCalled();
  expect(window.location.hash).toBe('');
});

test('a modified click is left to the browser', () => {
  const { getByText } = renderPage();

  expect(fireEvent.click(getByText('Second'), { ctrlKey: true })).toBe(true);

  expect(scrollTo).not.toHaveBeenCalled();
});

test('the header sits in a sticky slot at the top', () => {
  const { container } = renderPage();
  const slot = required(container.querySelector('header')?.parentElement);
  expect(slot.className).toContain('sticky');
  expect(slot.className).toContain('top-0');
});
