import type { Elb } from '@walkeros/core';
import type { Settings } from '../types';
import { getAllEvents, getEvents, getGlobals } from '../walker';
import {
  handleTrigger,
  initGlobalTrigger,
  initScopeTrigger,
  resetScrollListener,
  Triggers,
} from '../trigger';

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
    },
  },
  onApply: jest.fn(),
}));

const createTestSettings = (prefix = 'data-elb'): Settings => ({
  prefix,
  scope: document,
  pageview: false,
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

    test('click delegation reaches shadow host but misses shadow action', () => {
      // This test documents the CURRENT broken behavior
      document.body.innerHTML = `
        <div id="host" data-elb="product" data-elb-product="id:123">
        </div>
      `;

      const host = document.getElementById('host')!;
      const shadowRoot = host.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = `
        <button id="shadow-btn" data-elbaction="click:add">Add to Cart</button>
      `;

      // When handleTrigger receives the HOST (as happens with retargeting),
      // it won't find any action because data-elbaction is in shadow DOM
      const context = { elb: mockElb, settings: createTestSettings() };
      const result = handleTrigger(context, host, Triggers.Click);

      // Current behavior: no event fires because host has no data-elbaction
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

      const events = getAllEvents();

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

    test('getGlobals should find globals inside shadow DOM', () => {
      document.body.innerHTML = `
        <div id="host"></div>
        <div data-elbglobals="env:production"></div>
      `;

      const host = document.getElementById('host')!;
      const shadowRoot = host.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = `
        <div data-elbglobals="version:v2"></div>
      `;

      const globals = getGlobals();

      // Light DOM global works
      expect(globals).toHaveProperty('env', 'production');

      // BUG: Shadow DOM global is invisible to querySelectorAll
      // Expected: should also find version from shadow DOM
      expect(globals).toHaveProperty('version', 'v2');
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
});
