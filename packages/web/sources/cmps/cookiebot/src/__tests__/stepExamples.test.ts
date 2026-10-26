import type { Flow, Trigger } from '@walkeros/core';
import { examples } from '../dev';
import { sourceCookiebot } from '../index';
import type { CookiebotAPI } from '../types';
import {
  createMockElb,
  createMockWindow,
  createCookiebotSource,
  ConsentCall,
} from './test-utils';

/** A source step example's `mapping` carries the settings the docs render. */
function settingsOf(example: Flow.StepExample): Record<string, unknown> {
  const { mapping } = example;
  return mapping &&
    typeof mapping === 'object' &&
    'settings' in mapping &&
    mapping.settings &&
    typeof mapping.settings === 'object'
    ? { ...mapping.settings }
    : {};
}

function isCookiebot(value: unknown): value is CookiebotAPI {
  return typeof value === 'object' && value !== null && 'consent' in value;
}

function dispatchOf(example: Flow.StepExample): 'init' | 'event' {
  const options = example.trigger?.options;
  return typeof options === 'object' &&
    options !== null &&
    'dispatch' in options &&
    options.dispatch === 'event'
    ? 'event'
    : 'init';
}

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    if (!isCookiebot(example.in))
      throw new Error('A Cookiebot step example in is the Cookiebot state');
    const cookiebot = example.in;
    const consentCalls: ConsentCall[] = [];
    const mockElb = createMockElb(consentCalls);
    const viaEvent = dispatchOf(example) === 'event';

    const mockWindow = createMockWindow(viaEvent ? undefined : cookiebot);
    await createCookiebotSource(mockWindow, mockElb, {
      settings: settingsOf(example),
    });

    if (viaEvent) {
      mockWindow.Cookiebot = cookiebot;
      mockWindow.__fire(
        cookiebot.consented ? 'CookiebotOnAccept' : 'CookiebotOnDecline',
      );
    }

    const captured = mockElb.mock.calls.map((args) => ['elb', ...args]);
    expect(captured).toEqual(example.out);
  });
});

describe('createTrigger', () => {
  let instance: Trigger.Instance<unknown, void> | undefined;

  beforeEach(() => {
    // startFlow runs the real collector; the shared setup fakes timers.
    jest.useRealTimers();
    Reflect.deleteProperty(window, 'Cookiebot');
  });

  afterEach(async () => {
    if (instance?.flow) await instance.flow.collector.command('shutdown');
    instance = undefined;
    Reflect.deleteProperty(window, 'Cookiebot');
  });

  // `walkeros push --simulate` drives a source through its createTrigger, so
  // every step example must produce its documented consent through it.
  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    if (!isCookiebot(example.in))
      throw new Error('A Cookiebot step example in is the Cookiebot state');

    instance = await examples.createTrigger({
      sources: {
        consent: {
          code: sourceCookiebot,
          config: { settings: settingsOf(example) },
        },
      },
    });
    await instance.trigger(
      example.trigger?.type,
      example.trigger?.options,
    )(example.in);
    await new Promise((resolve) => setTimeout(resolve, 20));

    const expected = example.out?.[0]?.[2] ?? {};
    expect(instance.flow?.collector.consent).toEqual(expected);
  });

  it('rejects content that is not a Cookiebot state', async () => {
    instance = await examples.createTrigger({
      sources: { consent: { code: sourceCookiebot } },
    });

    await expect(
      instance.trigger('consent')({ marketing: true }),
    ).rejects.toThrow('window.Cookiebot state');
  });
});
