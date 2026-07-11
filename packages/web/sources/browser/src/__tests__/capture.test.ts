import { startFlow } from '@walkeros/collector';
import { createBrowserSource, flushChain } from './test-utils';
import type { WalkerOS } from '@walkeros/core';

// Real collector + capturing destination; returns emitted events.
async function setup() {
  const events: WalkerOS.Event[] = [];
  const { collector } = await startFlow({
    destinations: {
      capture: {
        code: {
          type: 'capture',
          config: {},
          push: async (event: WalkerOS.Event) => {
            events.push(event);
          },
        },
      },
    },
  });
  return { collector, events };
}

// Build: <div data-elb=product data-elb-product=name:Shoe>
//          <button data-elbaction="click:add">Add</button>
//        </div>
// A BUBBLE-phase listener on the div synchronously unmounts the clicked button
// on click, detaching the target from its data-elb ancestor before any
// document-bubble read but after any document-capture read. This models a
// framework committing a synchronous unmount inside its own (earlier-in-bubble)
// click handler. NOTE: `entity.remove()` alone would NOT detach the target,
// because the button stays a child of the removed div and the walker resolves
// the entity via `parentElement` with no DOM-connectivity check; the button
// itself must leave its data-elb ancestor for the entity to be lost.
function buildDomWithSelfRemovingTarget(): HTMLButtonElement {
  document.body.innerHTML =
    '<div data-elb="product" data-elb-product="name:Shoe">' +
    '<button data-elbaction="click:add">Add</button>' +
    '</div>';
  const entity = document.querySelector('div')!;
  const button = document.querySelector('button')!;
  entity.addEventListener('click', () => button.remove()); // bubble phase
  return button;
}

// Build two SIBLING elements linked via data-elblink:
//   <button data-elbaction="click:add" data-elblink="prod1:child">Add</button>
//   <div data-elb="product" data-elb-product="name:Shoe" data-elblink="prod1:parent"></div>
// The clicked button resolves its entity through the .link() path, which finds
// the parent via a LIVE document query for [data-elblink="prod1:parent"]
// (walker.ts getParent), not a parentElement walk-up. A bubble-phase listener on
// the button removes the SEPARATE parent entity div from the document, so under
// bubble phase the query finds nothing (entity lost -> page fallback), while
// under capture phase walkerOS reads before the removal. This is the exact
// user-reported SPA menu-click scenario.
function buildDomWithLinkedRemovableEntity(): HTMLButtonElement {
  document.body.innerHTML =
    '<button data-elbaction="click:add" data-elblink="prod1:child">Add</button>' +
    '<div data-elb="product" data-elb-product="name:Shoe" data-elblink="prod1:parent"></div>';
  const button = document.querySelector('button')!;
  const entity = document.querySelector('div')!;
  button.addEventListener('click', () => entity.remove()); // bubble phase, detaches the linked parent
  return button;
}

describe('capture-phase trigger', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.elbLayer = undefined;
  });
  afterEach(() => {
    document.body.innerHTML = '';
    window.elbLayer = undefined;
  });

  test('default (capture) reads the entity at click time despite a synchronous unmount', async () => {
    const { collector, events } = await setup();
    const button = buildDomWithSelfRemovingTarget();
    await createBrowserSource(collector, { pageview: false }); // capture defaults true
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushChain();
    const event = events.find((e) => e.action === 'add');
    expect(event?.entity).toBe('product');
    expect(event?.data).toEqual(expect.objectContaining({ name: 'Shoe' }));
  });

  test('capture:false restores the previous bubble behavior (entity lost to the unmount)', async () => {
    const { collector, events } = await setup();
    const button = buildDomWithSelfRemovingTarget();
    await createBrowserSource(collector, { pageview: false, capture: false });
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushChain();
    const event = events.find((e) => e.action === 'add');
    // Detached target -> no entity found -> page fallback, empty data.
    expect(event?.entity).toBe('page');
    expect(event?.data).toEqual({});
  });

  test('capture reads a tagged click even when a descendant calls stopPropagation', async () => {
    const { collector, events } = await setup();
    document.body.innerHTML =
      '<div data-elb="product" data-elb-product="name:Shoe">' +
      '<button data-elbaction="click:add">Add</button>' +
      '</div>';
    const button = document.querySelector('button')!;
    // A handler between target and document stops propagation in the bubble
    // phase; under capture, walkerOS has already read before this runs.
    button.addEventListener('click', (e) => e.stopPropagation());
    await createBrowserSource(collector, { pageview: false });
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushChain();
    const event = events.find((e) => e.action === 'add');
    expect(event?.entity).toBe('product');
    expect(event?.data).toEqual(expect.objectContaining({ name: 'Shoe' }));
  });

  test('default (capture) resolves a .link() entity before a bubble-phase removes the linked parent', async () => {
    const { collector, events } = await setup();
    const button = buildDomWithLinkedRemovableEntity();
    await createBrowserSource(collector, { pageview: false }); // capture defaults true
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushChain();
    const event: WalkerOS.Event | undefined = events.find(
      (e) => e.action === 'add',
    );
    expect(event?.entity).toBe('product');
    expect(event?.data).toEqual(expect.objectContaining({ name: 'Shoe' }));
  });

  test('capture:false loses a .link() entity when the linked parent is removed in the bubble phase', async () => {
    const { collector, events } = await setup();
    const button = buildDomWithLinkedRemovableEntity();
    await createBrowserSource(collector, { pageview: false, capture: false });
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushChain();
    const event: WalkerOS.Event | undefined = events.find(
      (e) => e.action === 'add',
    );
    // The linked parent was removed before the bubble-phase read -> page fallback.
    expect(event?.entity).toBe('page');
    expect(event?.data).toEqual({});
  });
});
