import type { WalkerOS } from '@walkeros/core';
import type { DestinationPlausible } from '.';
import type { DestinationWeb } from '@walkeros/web-core';
import { createCollector } from '@walkeros/collector';
import { getEvent, mockEnv } from '@walkeros/core';
import { examples } from '.';

const { env, events, mapping } = examples;

describe('destination plausible', () => {
  let elb: WalkerOS.Elb;
  let destination: DestinationPlausible.Destination;

  let calls: Array<{ path: string[]; args: unknown[] }>;
  let testEnv: DestinationWeb.Environment;
  let createElementMock: jest.Mock;
  let appendChildMock: jest.Mock;

  const event = getEvent();
  const script = 'https://plausible.io/js/script.manual.js';

  beforeEach(async () => {
    destination = jest.requireActual('.').default;

    jest.clearAllMocks();
    calls = [];

    // Set up Jest mocks
    createElementMock = jest.fn(() => ({
      src: '',
      dataset: {},
      setAttribute: jest.fn(),
      removeAttribute: jest.fn(),
    }));
    appendChildMock = jest.fn();

    // Create test environment using example env with call interceptor
    testEnv = mockEnv(env.env.push, (path, args) => {
      calls.push({ path, args });
    });

    // Replace document methods with Jest mocks after proxy creation
    if (testEnv.document) {
      testEnv.document.createElement = createElementMock;
      (testEnv.document.head as { appendChild: jest.Mock }).appendChild =
        appendChildMock;
      testEnv.document.querySelector = jest.fn();
    }

    ({ elb } = await createCollector({
      tagging: 2,
    }));
  });

  afterEach(() => {});

  test('init', async () => {
    // Use init environment where plausible is undefined
    const initEnv = env.env.init;

    expect(initEnv?.window.plausible).not.toBeDefined();

    const destinationWithEnv = {
      ...destination,
      env: initEnv,
    };
    elb('walker destination', destinationWithEnv, {});

    await elb(event);
    // After init() is called, plausible should be defined
    expect(initEnv?.window.plausible).toBeDefined();
  });

  test('init with script load', async () => {
    // For now, skip complex document mocking and focus on core functionality
    // TODO: Fix document mocking with environment injection
    const simpleEnv = {
      ...testEnv,
      document: {
        createElement: createElementMock,
        head: { appendChild: appendChildMock },
        querySelector: jest.fn(),
      },
    };

    const destinationWithEnv = {
      ...destination,
      env: simpleEnv,
    };
    elb('walker destination', destinationWithEnv, { loadScript: true });

    await elb(event);

    // Verify script createElement was called
    expect(createElementMock).toHaveBeenCalledWith('script');
    // Verify appendChild was called
    expect(appendChildMock).toHaveBeenCalled();
  });

  test('init with domain', async () => {
    const domain = 'elbwalker.com';
    const mockScript = {
      src: '',
      dataset: {} as Record<string, string>,
      setAttribute: jest.fn(),
      removeAttribute: jest.fn(),
    };
    createElementMock.mockReturnValue(mockScript);

    const simpleEnv = {
      ...testEnv,
      document: {
        createElement: createElementMock,
        head: { appendChild: appendChildMock },
        querySelector: jest.fn(),
      },
    };

    const destinationWithEnv = {
      ...destination,
      env: simpleEnv,
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

    // Check that plausible was called with the expected arguments
    expect(calls).toContainEqual({
      path: ['window', 'plausible'],
      args: events.customEvent(),
    });
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

    // Check that plausible was called with the expected arguments
    expect(calls).toContainEqual({
      path: ['window', 'plausible'],
      args: events.purchase(),
    });
  });
});
