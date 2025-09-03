import type { WalkerOS } from '@walkeros/core';
import type { DestinationPlausible } from '.';
import { createCollector } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
import { destinationPlausibleExamples } from './examples';

const { events, mapping } = destinationPlausibleExamples;

describe('destination plausible', () => {
  let elb: WalkerOS.Elb;
  let destination: DestinationPlausible.Destination;

  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = getEvent();
  const script = 'https://plausible.io/js/script.manual.js';

  const testEnv = {
    window: {
      plausible: mockFn,
    },
    document: {
      createElement: jest.fn(() => ({
        src: '',
        dataset: {},
        setAttribute: jest.fn(),
        removeAttribute: jest.fn(),
      })),
      head: { appendChild: jest.fn() },
      querySelector: jest.fn(),
    },
  };

  beforeEach(async () => {
    destination = jest.requireActual('.').default;

    jest.clearAllMocks();

    ({ elb } = await createCollector({
      tagging: 2,
    }));
  });

  afterEach(() => {});

  test('init', async () => {
    // Environment without plausible initially
    const initEnv = {
      ...testEnv,
      window: { plausible: undefined },
    };

    expect(initEnv.window.plausible).not.toBeDefined();

    const destinationWithEnv = {
      ...destination,
      env: initEnv,
    };
    elb('walker destination', destinationWithEnv, {});

    await elb(event);
    // After init() is called, plausible should be defined
    expect(initEnv.window.plausible).toBeDefined();
  });

  test('init with script load', async () => {
    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', destinationWithEnv, { loadScript: true });

    await elb(event);

    // Verify script createElement was called
    expect(testEnv.document.createElement).toHaveBeenCalledWith('script');
    // Verify appendChild was called
    expect(testEnv.document.head.appendChild).toHaveBeenCalled();
  });

  test('init with domain', async () => {
    const domain = 'elbwalker.com';
    const mockScript = {
      src: '',
      dataset: {} as Record<string, string>,
      setAttribute: jest.fn(),
      removeAttribute: jest.fn(),
    };
    testEnv.document.createElement.mockReturnValue(mockScript);

    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', destinationWithEnv, {
      loadScript: true,
      settings: { domain },
    });

    await elb(event);

    expect((mockScript.dataset as Record<string, string>).domain).toBe(domain);
  });

  test('event entity action', async () => {
    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', destinationWithEnv, {
      mapping: mapping.config,
    });

    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.customEvent());
  });

  test('event purchase', async () => {
    const event = getEvent('order complete');
    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', destinationWithEnv, {
      mapping: mapping.config,
    });

    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.purchase());
  });
});
