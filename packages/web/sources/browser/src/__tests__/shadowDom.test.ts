import type { Elb } from '@walkeros/core';
import type { Settings, Context } from '../types';
import { getAllEvents, getEvents, getGlobals } from '../walker';
import {
  destroyTriggers,
  handleTrigger,
  initGlobalTrigger,
  initScopeTrigger,
  resetScrollListener,
  Triggers,
} from '../trigger';
import { translateToCoreCollector } from '../translation';

jest.mock('@walkeros/core', () => ({
  ...jest.requireActual('@walkeros/core'),
  tryCatch: (fn: () => void) => fn,
}));

jest.mock('@walkeros/collector', () => ({
  Const: {
    Commands: {
      Action: 'action',
      Actions: 'actions',
      Context: 'context',
      Globals: 'globals',
      Link: 'link',
      Prefix: 'data-elb',
      Scoped: '_',
    },
  },
  onApply: jest.fn(),
  createPushResult: (partial?: { ok?: boolean; failed?: unknown }) => ({
    ok: !partial?.failed,
    ...partial,
  }),
}));

// Mock isVisible so the final visibility re-check inside the intersection timer
// always passes (jsdom lays nothing out). This makes the visible/impression
// block a WIRING test, not a visual one.
jest.mock('@walkeros/web-core', () => ({
  ...jest.requireActual('@walkeros/web-core'),
  isVisible: jest.fn(() => true),
}));

const createTestSettings = (prefix = 'data-elb'): Settings => ({
  prefix,
  scope: document,
  pageview: false,
  capture: true,
  elb: '',
  elbLayer: false,
});

describe('Shadow DOM', () => {
  let mockElb: jest.MockedFunction<Elb.Fn>;

  beforeEach(() => {
    jest.clearAllMocks();
    resetScrollListener();
    document.body.innerHTML = '';
    mockElb = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Bug 1: Click event target retargeting', () => {
    // When a click originates inside an open shadow root, ev.target is
    // retargeted to the shadow host. The click handler uses ev.target
    // directly, so it never sees the actual clicked element inside the
    // shadow DOM. ev.composedPath()[0] would give the real target.

    test('click on element inside open shadow DOM should fire event', () => {
      document.body.innerHTML = `
        <div id="host" data-elb="product" data-elb-product="id:123">
        </div>
      `;

      const host = document.getElementById('host')!;
      const shadowRoot = host.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = `
        <button id="shadow-btn" data-elbaction="click:add">Add to Cart</button>
      `;

      const shadowBtn = shadowRoot.getElementById('shadow-btn')!;

      // Simulate what happens during a real click: the browser fires the
      // event on document with ev.target retargeted to the host element.
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        composed: true,
      });

      // Override target to simulate browser retargeting behavior
      Object.defineProperty(clickEvent, 'target', { value: host });
      Object.defineProperty(clickEvent, 'composedPath', {
        value: () => [shadowBtn, shadowRoot, host, document.body, document],
      });

      // Set up the global click listener via the production code path
      const context = { elb: mockElb, settings: createTestSettings() };
      initGlobalTrigger(context, createTestSettings());

      document.dispatchEvent(clickEvent);

      // BUG: The handler receives the host as target, which has no
      // data-elbaction. The action attribute is on the shadow button.
      // Expected: event should fire with entity "product", action "add"
      expect(mockElb).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'product add',
          entity: 'product',
          action: 'add',
          trigger: 'click',
        }),
      );
    });

    test('handleTrigger with host element directly finds no action', () => {
      // When handleTrigger is called with the host element directly
      // (bypassing composedPath), no action fires because the host
      // has no data-elbaction — the action is inside the shadow root.
      // This is expected: composedPath is what makes click delegation work.
      document.body.innerHTML = `
        <div id="host" data-elb="product" data-elb-product="id:123">
        </div>
      `;

      const host = document.getElementById('host')!;
      const shadowRoot = host.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = `
        <button id="shadow-btn" data-elbaction="click:add">Add to Cart</button>
      `;

      const context = { elb: mockElb, settings: createTestSettings() };
      handleTrigger(context, host, Triggers.Click);

      expect(mockElb).not.toHaveBeenCalled();
    });
  });

  describe('Bug 2: Element discovery via querySelectorAll', () => {
    // querySelectorAll does not cross shadow DOM boundaries.
    // getAllEvents(), initScopeTrigger(), and getGlobals() all rely on it.

    test('getAllEvents should find action elements inside open shadow DOM', () => {
      document.body.innerHTML = `
        <div id="host" data-elb="widget" data-elb-widget="type:banner">
        </div>
      `;

      const host = document.getElementById('host')!;
      const shadowRoot = host.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = `
        <div data-elbaction="load:show">Banner Content</div>
      `;

      const events = getAllEvents(document.body);

      // BUG: querySelectorAll('[data-elbaction]') on document won't find
      // elements inside shadow DOM
      // Expected: should find the load:show action on the shadow element
      expect(events.length).toBeGreaterThan(0);
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            entity: 'widget',
            action: 'show',
          }),
        ]),
      );
    });

    test('initScopeTrigger should discover load triggers inside shadow DOM', () => {
      document.body.innerHTML = `
        <div id="host" data-elb="tracker" data-elb-tracker="name:hero">
        </div>
      `;

      const host = document.getElementById('host')!;
      const shadowRoot = host.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = `
        <div data-elbaction="load:impression">Track me</div>
      `;

      const context = { elb: mockElb, settings: createTestSettings() };
      initScopeTrigger(context, createTestSettings());

      // BUG: querySelectorAll won't find the load trigger inside shadow DOM
      // Expected: load event should fire for the shadow element
      expect(mockElb).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'tracker impression',
          trigger: 'load',
        }),
      );
    });

    test('getGlobals does not recurse into shadow DOM (performance trade-off)', () => {
      // getGlobals uses plain queryAll (no shadow recursion) because it runs
      // on every event push. Scanning all descendants for shadow hosts on each
      // click would be too expensive. Globals inside shadow DOM is not supported.
      document.body.innerHTML = `
        <div id="host"></div>
        <div data-elbglobals="env:production"></div>
      `;

      const host = document.getElementById('host')!;
      const shadowRoot = host.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = `
        <div data-elbglobals="version:v2"></div>
      `;

      const globals = getGlobals(undefined, document);

      // Light DOM global works
      expect(globals).toHaveProperty('env', 'production');

      // Shadow DOM globals are intentionally not collected (performance)
      expect(globals).not.toHaveProperty('version');
    });
  });

  describe('Bug 3: Property collection inside shadow DOM', () => {
    // When an entity element is found, getEntity() uses queryAll() to
    // collect data-elb-[entity] property elements within it. Properties
    // inside shadow DOM children won't be found.

    test('entity properties inside shadow DOM should be collected', () => {
      document.body.innerHTML = `
        <div id="host"
          data-elb="product"
          data-elb-product="name:Widget"
          data-elbaction="load:view">
        </div>
      `;

      const host = document.getElementById('host')!;
      const shadowRoot = host.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = `
        <span data-elb-product="price:29.99"></span>
        <span data-elb-product="color:blue"></span>
      `;

      const events = getEvents(host, Triggers.Load);

      // Host-level property works
      expect(events[0].data).toHaveProperty('name', 'Widget');

      // BUG: Properties inside shadow DOM children are invisible
      // Expected: should also collect price and color from shadow DOM
      expect(events[0].data).toHaveProperty('price', 29.99);
      expect(events[0].data).toHaveProperty('color', 'blue');
    });

    test('nested entities inside shadow DOM should be collected', () => {
      document.body.innerHTML = `
        <div id="host"
          data-elb="list"
          data-elb-list="type:recommendations"
          data-elbaction="load:view">
        </div>
      `;

      const host = document.getElementById('host')!;
      const shadowRoot = host.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = `
        <div data-elb="item" data-elb-item="id:1">Item 1</div>
        <div data-elb="item" data-elb-item="id:2">Item 2</div>
      `;

      const events = getEvents(host, Triggers.Load);

      // BUG: Nested entities inside shadow DOM are invisible to queryAll
      // Expected: should find both nested item entities
      expect(events[0].nested.length).toBe(2);
      expect(events[0].nested).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ entity: 'item', data: { id: 1 } }),
          expect.objectContaining({ entity: 'item', data: { id: 2 } }),
        ]),
      );
    });
  });

  describe('Existing support: upward traversal works', () => {
    // This verifies the ONE thing that already works: getParent() crosses
    // shadow boundaries going UP from shadow DOM to light DOM.

    test('getEvents from shadow element traverses up to host entity', () => {
      document.body.innerHTML = `
        <div id="host" data-elb="product" data-elb-product="id:123">
        </div>
      `;

      const host = document.getElementById('host')!;
      const shadowRoot = host.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = `
        <button id="shadow-btn" data-elbaction="click:add">Add</button>
      `;

      const shadowBtn = shadowRoot.getElementById('shadow-btn')!;

      // When given a direct reference, upward traversal works
      const events = getEvents(shadowBtn, Triggers.Click);

      expect(events).toMatchObject([
        {
          entity: 'product',
          action: 'add',
          data: { id: 123 },
        },
      ]);
    });

    test('context collection works across shadow boundary going up', () => {
      document.body.innerHTML = `
        <div data-elbcontext="section:hero">
          <div id="host" data-elb="cta" data-elb-cta="label:signup">
          </div>
        </div>
      `;

      const host = document.getElementById('host')!;
      const shadowRoot = host.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = `
        <button id="shadow-btn" data-elbaction="click:engage">Go</button>
      `;

      const shadowBtn = shadowRoot.getElementById('shadow-btn')!;
      const events = getEvents(shadowBtn, Triggers.Click);

      expect(events).toMatchObject([
        {
          entity: 'cta',
          action: 'engage',
          data: { label: 'signup' },
          context: { section: ['hero', 0] },
        },
      ]);
    });
  });

  describe('Closed shadow root as walker init scope', () => {
    // A closed shadow root is unreachable from the document (host.shadowRoot is
    // null), so discovery can never find it. The app retains the closed-root
    // reference and passes it straight to `walker init`. normalizeInitScopes
    // must accept it (nodeType 11) and initScopeTrigger must scan it without
    // calling getAttribute on the root itself.
    afterEach(() => {
      destroyTriggers();
    });

    test('closed shadow root passed to walker init is accepted, scanned, and fires load', async () => {
      const host = document.createElement('div');
      const root = host.attachShadow({ mode: 'closed' });
      root.innerHTML =
        '<div id="c" data-elb="widget" data-elb-widget="k:v" data-elbaction="load:show"></div>';

      const context: Context = {
        elb: mockElb,
        settings: createTestSettings(),
        initScope: initScopeTrigger,
      };

      const result = await translateToCoreCollector(
        context,
        'walker init',
        root,
      );

      // Accepted, did not throw, resolved ok.
      expect(result).toEqual(expect.objectContaining({ ok: true }));

      // Scanned: load fires immediately on scan (no IntersectionObserver), with
      // the entity resolved from the tagged child inside the closed root.
      expect(mockElb).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'widget show',
          entity: 'widget',
          action: 'show',
          trigger: 'load',
        }),
      );
    });
  });

  describe('Visible/impression inside shadow DOM', () => {
    // WIRING proof, not visual proof. isVisible is mocked true (jsdom lays
    // nothing out) and the IntersectionObserver is stubbed, so this asserts
    // only that an open-shadow element is DISCOVERED (queryAllComposed
    // recurses the open root), OBSERVED (handleActionElem → triggerVisible +
    // bucket.observed.add), and FIRES through the real trigger pipeline, with
    // its entity resolved UPWARD across the shadow boundary via getParent.
    // Visual visibility behavior is covered elsewhere (isVisible unit tests
    // and the browser harness).
    const instances: MockIntersectionObserver[] = [];

    // Cast-free IntersectionObserver stub: a class implementing the interface,
    // so it is assignable to `typeof IntersectionObserver` without casts.
    class MockIntersectionObserver implements IntersectionObserver {
      root: Document | Element | null = null;
      rootMargin = '0px';
      thresholds: ReadonlyArray<number> = [0, 0.5];
      readonly callback: IntersectionObserverCallback;
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
      takeRecords = jest.fn(() => []);

      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        instances.push(this);
      }
    }

    // Drive an intersection for an element across every captured observer; only
    // the observer that registered the element's config fires a trigger.
    const fireVisible = (el: Element) =>
      instances.forEach((observer) => {
        const entry: Partial<IntersectionObserverEntry> = {
          target: el,
          intersectionRatio: 0.6,
        };
        observer.callback([entry as IntersectionObserverEntry], observer);
      });

    let originalIO: typeof IntersectionObserver;

    beforeEach(() => {
      jest.useFakeTimers();
      // Earlier tests in this file call initScopeTrigger without tearing down,
      // leaving a no-op observer in the shared per-document visibility state
      // (jsdom has no IntersectionObserver). Clear it so this block's fresh
      // MockIntersectionObserver is the one that gets installed.
      destroyTriggers();
      instances.length = 0;
      originalIO = global.IntersectionObserver;
      global.IntersectionObserver = MockIntersectionObserver;
    });

    afterEach(() => {
      // Module-level trigger/visibility state is shared within the file; tear
      // it down so observers and scope buckets do not leak into the next test.
      destroyTriggers();
      global.IntersectionObserver = originalIO;
      jest.useRealTimers();
    });

    test('impression:view on an open-shadow element fires with the host entity', async () => {
      document.body.innerHTML = `
        <div id="host" data-elb="promo" data-elb-promo="id:p1"></div>
      `;
      const host = document.getElementById('host')!;
      const shadowRoot = host.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = `
        <div id="inner" data-elbaction="impression:view"></div>
      `;
      const inner = shadowRoot.getElementById('inner')!;

      // initScopeTrigger is the exact path `walker run` takes
      // (processLoadTriggers → initScopeTrigger): it discovers `inner` via
      // queryAllComposed and observes it via handleActionElem.
      const context = { elb: mockElb, settings: createTestSettings() };
      initScopeTrigger(context, createTestSettings());

      fireVisible(inner);
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      // Entity resolves UPWARD across the open boundary: the action lives on
      // the shadow `inner`, the entity + data on the light-DOM host.
      expect(mockElb).toHaveBeenCalledTimes(1);
      expect(mockElb).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'promo view',
          entity: 'promo',
          action: 'view',
          trigger: 'impression',
          data: { id: 'p1' },
        }),
      );
    });

    test('visible:view on an open-shadow element fires the visible trigger', async () => {
      document.body.innerHTML = `
        <div id="host" data-elb="promo" data-elb-promo="id:p1"></div>
      `;
      const host = document.getElementById('host')!;
      const shadowRoot = host.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = `
        <div id="inner" data-elbaction="visible:view"></div>
      `;
      const inner = shadowRoot.getElementById('inner')!;

      const context = { elb: mockElb, settings: createTestSettings() };
      initScopeTrigger(context, createTestSettings());

      fireVisible(inner);
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(mockElb).toHaveBeenCalledTimes(1);
      expect(mockElb).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'promo view',
          entity: 'promo',
          action: 'view',
          trigger: 'visible',
          data: { id: 'p1' },
        }),
      );
    });
  });
});
