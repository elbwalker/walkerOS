import { startFlow, Const } from '@walkeros/collector';
import { createBrowserSource, flushChain } from './test-utils';
import type { WalkerOS, Collector } from '@walkeros/core';

describe('Browser Source Integration Tests', () => {
  let collector: Collector.Instance;
  let collectedEvents: WalkerOS.Event[];
  let mockPush: jest.MockedFunction<Collector.Instance['push']>;

  beforeEach(async () => {
    collectedEvents = [];
    document.body.innerHTML = '';

    // Clear any existing elbLayer
    window.elbLayer = undefined;

    // Create mock push function
    mockPush = jest.fn().mockImplementation((...args: unknown[]) => {
      collectedEvents.push(args[0] as WalkerOS.Event);
      return Promise.resolve({
        ok: true,
      });
    }) as jest.MockedFunction<Collector.Instance['push']>;

    // Initialize collector without any sources to avoid initial triggers
    ({ collector } = await startFlow());

    // Override push with mock
    collector.push = mockPush;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    window.elbLayer = undefined;
  });

  describe('Complete Event Flow', () => {
    test('processes DOM element with load trigger', async () => {
      // Due to run-only behavior, test manual event instead
      const { elb } = await createBrowserSource(collector, { pageview: false });

      // Clear mock to test event processing
      mockPush.mockClear();

      // Manually trigger event to test source information addition
      if (elb) {
        await elb('product view', { id: 123, name: 'Test Product' }, 'load');
      }

      // Should have processed the event with source information
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'product view',
          data: expect.objectContaining({
            id: 123,
            name: 'Test Product',
          }),
          trigger: 'load',
          source: expect.objectContaining({
            type: 'browser',
          }),
        }),
      );
    });

    test('processes pageview events correctly', async () => {
      // Set URL path
      window.history.replaceState({}, '', '/test-page');

      // Initialize source with pageview enabled
      const source = await createBrowserSource(collector, { pageview: true });

      // No pageview during init — waits for on('run')
      expect(mockPush).not.toHaveBeenCalled();

      // Trigger run — this is when pageview fires (same as startFlow → command('run'))
      if (source.on) {
        await source.on('run', collector);
      }
      // The controller chain now carries an extra link (sendUser precedes
      // sendPageview), so drain the microtask queue before asserting.
      await flushChain();

      // Should have processed pageview event
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'page view',
          trigger: 'load',
          data: expect.objectContaining({
            id: '/test-page',
          }),
        }),
      );
    });

    test('processes click events through complete flow', async () => {
      // Setup DOM with click trigger
      document.body.innerHTML = `
        <button data-elb="cta" data-elb-cta="text:Sign Up" data-elbaction="click:press">
          Sign Up
        </button>
      `;

      // Initialize source
      await createBrowserSource(collector, { pageview: false });

      // Simulate click event
      const button = document.querySelector('button')!;
      const clickEvent = new MouseEvent('click', { bubbles: true });
      button.dispatchEvent(clickEvent);

      // Should have processed the click
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'cta press',
          entity: 'cta',
          action: 'press',
          trigger: 'click',
          data: expect.objectContaining({
            text: 'Sign Up',
          }),
        }),
      );
    });

    test('processes Elb Layer commands in order', async () => {
      // Pre-populate elbLayer with commands
      window.elbLayer = [
        ['walker run', { consent: { marketing: true } }],
        ['page view', { title: 'Home' }, 'load', { url: '/' }],
        ['product click', { id: '123' }, 'click', { position: 1 }],
      ];

      // Initialize source - should process existing commands.
      // `runOnInit: true` drives on('run') so non-walker queue items drain.
      await createBrowserSource(
        collector,
        { pageview: false },
        {
          runOnInit: true,
        },
      );

      // Should process the 2 events (walker command goes to collector.command)
      expect(mockPush).toHaveBeenCalledTimes(2);

      // Events are processed in order
      expect(mockPush).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          name: 'page view',
          data: expect.objectContaining({ title: 'Home' }),
          trigger: 'load',
        }),
      );
      expect(mockPush).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          name: 'product click',
          data: expect.objectContaining({ id: '123' }),
          trigger: 'click',
        }),
      );
    });

    test('routes walker commands to collector.command (not collector.push)', async () => {
      // Mock collector.command to verify routing
      const mockCommand = jest.fn().mockResolvedValue({
        ok: true,
      });
      collector.command = mockCommand;

      // Pre-populate elbLayer with walker commands and events
      window.elbLayer = [
        ['walker run', { consent: { marketing: true } }],
        ['walker user', { id: 'user123' }],
        ['page view', { title: 'Test Page' }],
      ];

      // Clear mockPush to verify clean separation
      mockPush.mockClear();

      // Initialize source. `runOnInit: true` drives on('run') so
      // non-walker queue items drain.
      await createBrowserSource(
        collector,
        { pageview: false },
        {
          runOnInit: true,
        },
      );

      // Walker commands should go to collector.command (2 commands)
      expect(mockCommand).toHaveBeenCalledTimes(2);
      expect(mockCommand).toHaveBeenNthCalledWith(1, 'run', {
        consent: { marketing: true },
      });
      expect(mockCommand).toHaveBeenNthCalledWith(2, 'user', { id: 'user123' });

      // Events should go to collector.push (1 event)
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'page view',
          data: expect.objectContaining({ title: 'Test Page' }),
        }),
      );

      // Verify clean separation: commands never hit push, events never hit command
      const pushCalls = mockPush.mock.calls;
      const commandCalls = mockCommand.mock.calls;

      pushCalls.forEach((call) => {
        const firstArg = call[0];
        // Ensure no walker commands in push calls
        if (typeof firstArg === 'string') {
          expect(firstArg).not.toMatch(/^walker /);
        }
      });

      commandCalls.forEach((call) => {
        const [command] = call;
        // Ensure all command calls are from walker commands (no 'walker ' prefix after extraction)
        expect(command).not.toMatch(/^walker /);
        expect(['run', 'user']).toContain(command);
      });
    });
  });

  describe('Error Recovery', () => {
    test('handles malformed DOM attributes gracefully', async () => {
      document.body.innerHTML = `
        <div data-elb="product" data-elb-product="malformed:data:with:extra:colons" data-elbaction="load:view">
          Product
        </div>
        <div data-elb="valid" data-elb-valid="id:123" data-elbaction="load:test">
          Valid
        </div>
      `;

      const source = await createBrowserSource(collector, { pageview: false });

      // Load triggers fire on run, not during init
      if (source.on) await source.on('run');

      // Should still process at least the valid element
      expect(mockPush).toHaveBeenCalled();
    });
  });
});

// helper: real collector + a capturing destination for enriched events
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

describe('data-elbuser', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.elbLayer = undefined;
  });
  afterEach(() => {
    document.body.innerHTML = '';
    window.elbLayer = undefined;
  });

  test('sets collector.user from the DOM on run', async () => {
    const { collector } = await setup();
    document.body.innerHTML =
      '<div data-elbuser="id:u123;loggedin:true"></div>';
    await createBrowserSource(
      collector,
      { pageview: true },
      { runOnInit: true },
    );
    expect(collector.user).toEqual({ id: 'u123', loggedin: true });
  });

  test('the page view carries the user', async () => {
    const { collector, events } = await setup();
    document.body.innerHTML = '<div data-elbuser="id:u123"></div>';
    await createBrowserSource(
      collector,
      { pageview: true },
      { runOnInit: true },
    );
    const pageview = events.find((e) => e.name === 'page view');
    expect(pageview?.user).toEqual(expect.objectContaining({ id: 'u123' }));
  });

  test('merges multiple data-elbuser elements', async () => {
    const { collector } = await setup();
    document.body.innerHTML =
      '<div data-elbuser="id:a"></div><div data-elbuser="device:d1"></div>';
    await createBrowserSource(
      collector,
      { pageview: true },
      { runOnInit: true },
    );
    expect(collector.user).toEqual({ id: 'a', device: 'd1' });
  });

  test('does not push when no data-elbuser is present', async () => {
    const { collector } = await setup();
    const spy = jest.fn();
    // Registering on('user') fires the callback ONCE immediately against the
    // current (empty) state, the documented state-delivery catch-up contract:
    // shouldDeliver = allowed (true, run:true default) && cellVersion['user'] 0
    // > the subscriber's sentinel mark -1. That registration call is expected
    // and unrelated to this feature. Clear it so the assertion isolates the one
    // thing under test: "did the run push a walker user?" (a leak would fire it
    // again). Equivalent alternative: skip mockClear and assert
    // toHaveBeenCalledTimes(1) (registration only; a leaked push would be 2).
    await collector.command('on', { type: Const.Commands.User, rules: spy });
    spy.mockClear();
    document.body.innerHTML = '<div data-elb="entity"></div>';
    await createBrowserSource(
      collector,
      { pageview: true },
      { runOnInit: true },
    );
    expect(collector.user).toEqual({});
    expect(spy).not.toHaveBeenCalled();
  });

  test('does not wipe an existing user when absent', async () => {
    const { collector } = await setup(); // seed after setup for clarity
    await collector.command('user', { id: 'seed' });
    document.body.innerHTML = '<div data-elb="entity"></div>';
    await createBrowserSource(
      collector,
      { pageview: true },
      { runOnInit: true },
    );
    expect(collector.user).toEqual({ id: 'seed' });
  });

  // Covers the no-controller branch (elbLayer:false), which carries the new
  // `await sendUser` path and the entire deadlock argument. All the tests above
  // use the elbLayer controller default, so without this the awaited branch is
  // untested.
  test('elbLayer:false, sets user and the page view carries it', async () => {
    const { collector, events } = await setup();
    document.body.innerHTML = '<div data-elbuser="id:u123"></div>';
    await createBrowserSource(
      collector,
      { elbLayer: false, pageview: true },
      { runOnInit: true },
    );
    expect(collector.user).toEqual({ id: 'u123' });
    const pageview = events.find((e) => e.name === 'page view');
    expect(pageview?.user).toEqual(expect.objectContaining({ id: 'u123' }));
  });
});
