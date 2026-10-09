import { act, within } from '@testing-library/react';
import type { WalkerOS } from '@walkeros/core';
import type { DemoPageProps } from '../shared/controls';
import { bootDemo } from './boot';
import { ShopSitePage } from './pages';
import { WALKER_JS_URL, currentElb, installElbQueue } from './walkerjs';

// A page that shows what the boot hands it: the persona, a tagged user
// element and a persona switch.
const TestPage = ({ controls }: DemoPageProps) => (
  <div data-elbuser={`id:${controls.persona}`}>
    <p>Persona: {controls.persona}</p>
    <button type="button" onClick={() => controls.onPersonaSwitch('sam')}>
      Sam
    </button>
  </div>
);

const walkerScripts = () =>
  document.querySelectorAll(`script[src="${WALKER_JS_URL}"]`);

function newRoot(): HTMLElement {
  const element = document.createElement('div');
  document.body.appendChild(element);
  return element;
}

// Records, in order, whether the tagged page or the walker.js script was
// added to the document.
function watchAdditions() {
  const added: string[] = [];
  const record = (records: MutationRecord[]) => {
    for (const { addedNodes } of records)
      addedNodes.forEach((node) => {
        if (node instanceof HTMLScriptElement && node.src === WALKER_JS_URL)
          added.push('walker.js');
        else if (
          node instanceof Element &&
          (node.matches('[data-elbuser]') ||
            node.querySelector('[data-elbuser]'))
        )
          added.push('page');
      });
  };
  const observer = new MutationObserver(record);
  observer.observe(document, { childList: true, subtree: true });
  return () => {
    record(observer.takeRecords());
    observer.disconnect();
    return added;
  };
}

beforeEach(() => {
  window.history.replaceState(null, '', '/shop/?user=lisa');
});

afterEach(() => {
  walkerScripts().forEach((script) => script.remove());
  document.body.replaceChildren();
  Reflect.deleteProperty(window, 'elb');
  Reflect.deleteProperty(window, 'elbLayer');
  localStorage.clear();
});

test('renders the page with the persona from ?user= and loads walker.js once, after the first commit', async () => {
  const root = newRoot();
  const stop = watchAdditions();

  await act(async () => bootDemo(TestPage, root, () => {}));

  expect(within(root).getByText('Persona: lisa')).toBeTruthy();
  expect(walkerScripts()).toHaveLength(1);
  // No script before the first commit: the tagged elements were in the
  // document before walker.js was added.
  expect(stop()).toStrictEqual(['page', 'walker.js']);

  await act(async () => bootDemo(TestPage, newRoot(), () => {}));
  expect(walkerScripts()).toHaveLength(1);
});

test('a script error shows that walkerOS did not load', async () => {
  const root = newRoot();
  await act(async () => bootDemo(TestPage, root, () => {}));
  expect(within(root).queryByText(/walkerOS didn't load/)).toBeNull();

  act(() => {
    walkerScripts()[0].dispatchEvent(new Event('error'));
  });

  expect(within(root).getByRole('alert').textContent).toContain(
    "walkerOS didn't load",
  );
});

test('a persona switch navigates to its ?user=', async () => {
  const searches: string[] = [];
  const root = newRoot();
  await act(async () =>
    bootDemo(TestPage, root, (search) => {
      searches.push(search);
    }),
  );

  act(() => within(root).getByRole('button', { name: 'Sam' }).click());

  expect(searches).toStrictEqual(['?user=sam']);
});

test('before walker.js runs, calls queue in elbLayer; a remembered consent is queued again', async () => {
  localStorage.setItem('consentState', 'denied');
  await act(async () => bootDemo(TestPage, newRoot(), () => {}));

  expect(window.elbLayer).toStrictEqual([
    ['walker consent', { functional: true, marketing: false }],
    ['walker user', { device: undefined }],
  ]);
  // Queued, not delivered: the consent bar shows no "Not sent".
  await expect(currentElb(window)?.('walker run')).resolves.toStrictEqual({
    ok: true,
  });
});

test('the queue is only installed where no walkerOS runs yet', () => {
  const running: WalkerOS.Elb = async () => ({ ok: true });
  window.elb = running;
  installElbQueue(window);
  expect(window.elb).toBe(running);
});

test('the site Shop appends a product on "Add product"', async () => {
  const root = newRoot();
  await act(async () => bootDemo(ShopSitePage, root, () => {}));

  const cards = () =>
    root.querySelectorAll('[data-elbobserve] [data-elb="product"]').length;
  const before = cards();
  expect(before).toBeGreaterThan(0);

  act(() => within(root).getByRole('button', { name: 'Add product' }).click());

  expect(cards()).toBe(before + 1);
});
