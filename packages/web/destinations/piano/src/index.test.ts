import type { Config, Env } from './types';
import type { Destination } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
import destinationPiano from '.';

const SCRIPT_SRC = 'https://tag.aticdn.net/piano-analytics.js';

describe('destination piano', () => {
  const site = 123456789;
  const collectDomain = 'https://example.pa-cd.com';

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  async function register(env: Env, config: Config = {}) {
    const { elb } = await startFlow();
    await elb('walker destination', {
      code: { ...destinationPiano, env },
      config: { settings: { site, collectDomain }, ...config },
    });
    return elb;
  }

  test('configures piano on init', async () => {
    const setConfigurations = jest.fn();
    const env: Env = {
      window: {
        pa: { setConfigurations, sendEvent: jest.fn(), sendEvents: jest.fn() },
      },
    };

    const elb = await register(env);
    await elb(getEvent());

    expect(setConfigurations).toHaveBeenCalledWith({ site, collectDomain });
  });

  test('sends a mapped event', async () => {
    const sendEvent = jest.fn();
    const env: Env = {
      window: {
        pa: { setConfigurations: jest.fn(), sendEvent, sendEvents: jest.fn() },
      },
    };

    const elb = await register(env, {
      mapping: {
        page: {
          view: { name: 'page.display', data: { map: { page: 'data.title' } } },
        },
      },
    });
    await elb(getEvent('page view'));

    expect(sendEvent).toHaveBeenCalledWith('page.display', {
      page: 'walkerOS documentation',
    });
  });

  test('tolerates a missing SDK', async () => {
    const env: Env = { window: {} };

    const elb = await register(env);
    await expect(elb(getEvent())).resolves.toBeDefined();
  });

  test('loadScript injects the Piano script', async () => {
    const sendEvent = jest.fn();
    const env: Env = {
      window: {
        pa: { setConfigurations: jest.fn(), sendEvent, sendEvents: jest.fn() },
      },
    };

    const script = document.createElement('script');
    const createElement = jest
      .spyOn(document, 'createElement')
      .mockReturnValue(script);
    const appendChild = jest
      .spyOn(document.head, 'appendChild')
      .mockImplementation((node) => node);

    const elb = await register(env, { loadScript: true });
    await elb(getEvent());

    expect(createElement).toHaveBeenCalledWith('script');
    expect(script.src).toBe(SCRIPT_SRC);
    expect(appendChild).toHaveBeenCalledWith(script);
  });

  test('loadScript defers configuration until the script loads', async () => {
    const setConfigurations = jest.fn();
    const env: Env = {
      window: {
        pa: { setConfigurations, sendEvent: jest.fn(), sendEvents: jest.fn() },
      },
    };

    const script = document.createElement('script');
    jest.spyOn(document, 'createElement').mockReturnValue(script);
    jest.spyOn(document.head, 'appendChild').mockImplementation((node) => node);

    const elb = await register(env, { loadScript: true });
    await elb(getEvent());

    // The SDK loads asynchronously, so nothing is configured yet.
    expect(setConfigurations).not.toHaveBeenCalled();

    // Once the script fires onload, configuration runs.
    script.onload?.(new Event('load'));
    expect(setConfigurations).toHaveBeenCalledWith({ site, collectDomain });
  });

  test('warns when the Piano script fails to load', () => {
    const setConfigurations = jest.fn();
    const env: Env = {
      window: {
        pa: { setConfigurations, sendEvent: jest.fn(), sendEvents: jest.fn() },
      },
    };

    const script = document.createElement('script');
    jest.spyOn(document, 'createElement').mockReturnValue(script);
    jest.spyOn(document.head, 'appendChild').mockImplementation((node) => node);

    const warn = jest.fn();
    const logger = {
      error: jest.fn(),
      warn,
      info: jest.fn(),
      debug: jest.fn(),
      throw: jest.fn(),
    } as unknown as Destination.Context['logger'];

    destinationPiano.init?.({
      id: 'piano',
      config: { loadScript: true, settings: { site, collectDomain } },
      env,
      logger,
      collector: {} as Destination.Context['collector'],
    });

    // A blocked or failed script never fires onload, so nothing is configured.
    expect(setConfigurations).not.toHaveBeenCalled();

    // onerror surfaces a single warning instead of failing silently.
    script.onerror?.(new Event('error'));
    expect(warn).toHaveBeenCalledWith(
      'Piano Analytics script failed to load, destination not configured',
    );
    expect(setConfigurations).not.toHaveBeenCalled();
  });
});
