import type { WalkerOS } from '@walkeros/core';
import type { DestinationPlausible } from '.';
import type { DestinationWeb } from '@walkeros/web-core';
import { startFlow } from '@walkeros/collector';
import { createLogger, getEvent, mockEnv } from '@walkeros/core';
import { examples } from './dev';

describe('destination plausible', () => {
  let elb: WalkerOS.Elb;
  let destination: DestinationPlausible.Destination;

  let calls: Array<{ path: string[]; args: unknown[] }>;
  let testEnv: DestinationWeb.Env;
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
    testEnv = mockEnv(examples.env.push, (path, args) => {
      calls.push({ path, args });
    });

    // Replace document methods with Jest mocks after proxy creation
    if (testEnv.document) {
      testEnv.document.createElement = createElementMock;
      (testEnv.document.head as { appendChild: jest.Mock }).appendChild =
        appendChildMock;
      testEnv.document.querySelector = jest.fn();
    }

    ({ elb } = await startFlow());
  });

  afterEach(() => {});

  test('init', async () => {
    // Use init environment where plausible is undefined
    const initEnv = examples.env.init;
    expect(initEnv?.window.plausible).not.toBeDefined();

    const destinationWithEnv = {
      ...destination,
      env: initEnv,
    };
    elb('walker destination', { code: destinationWithEnv, config: {} });

    await elb(event);
    // After init() is called, plausible should be defined
    expect(initEnv?.window.plausible).toBeDefined();
  });

  // loadVendor injects into the page's document, once per src
  test('init with script load and domain', async () => {
    const domain = 'walkeros.io';
    const destinationWithEnv = {
      ...destination,
      env: { window: { plausible: jest.fn() } },
    };
    elb('walker destination', {
      code: destinationWithEnv,
      config: { loadScript: true, settings: { domain } },
    });

    await elb(event);

    const injected = document.querySelector<HTMLScriptElement>(
      'script[data-walkeros-vendor]',
    );
    expect(injected?.src).toBe(script);
    expect(injected?.dataset.domain).toBe(domain);
  });

  // Plausible attributes every event to data-domain: without it, none counts
  test('init with script load and no domain throws a config error naming domain', async () => {
    const { collector } = await startFlow();
    await expect(
      Promise.resolve().then(() =>
        destination.init?.({
          id: 'plausible',
          config: { loadScript: true, settings: {} },
          env: examples.env.push,
          logger: createLogger(),
          collector,
        }),
      ),
    ).rejects.toMatchObject({
      code: 'config',
      message: 'Plausible with loadScript needs settings domain',
    });
  });
});
