import type { Flow, Trigger } from '@walkeros/core';
import { sourceCookieConsent } from '../index';
import { examples } from '../dev';
import { createCookieConsentApi, isCookieConsentInput } from '../examples/env';
import { dispatchOf, eventOf } from '../examples/trigger';
import {
  createMockElb,
  createMockWindow,
  createCookieConsentSource,
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

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    if (!isCookieConsentInput(example.in))
      throw new Error(
        'A CookieConsent step example in is what window.CookieConsent answers',
      );
    const input = example.in;
    const consentCalls: ConsentCall[] = [];
    const mockElb = createMockElb(consentCalls);
    const dispatch = dispatchOf(example.trigger?.options);

    const mockWindow = createMockWindow(
      dispatch === 'init' ? input : undefined,
    );
    await createCookieConsentSource(mockWindow, mockElb, settingsOf(example));

    if (dispatch !== 'init') {
      mockWindow.CookieConsent = createCookieConsentApi(input);
      mockWindow.__dispatch(eventOf(dispatch));
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
    Reflect.deleteProperty(window, 'CookieConsent');
  });

  afterEach(async () => {
    if (instance?.flow) await instance.flow.collector.command('shutdown');
    instance = undefined;
    Reflect.deleteProperty(window, 'CookieConsent');
  });

  // `walkeros push --simulate` drives a source through its createTrigger, so
  // every step example must produce its documented consent through it.
  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    instance = await examples.createTrigger({
      sources: {
        consent: {
          code: sourceCookieConsent,
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

  it('rejects content that is not a CookieConsent state', async () => {
    instance = await examples.createTrigger({
      sources: { consent: { code: sourceCookieConsent } },
    });

    await expect(
      instance.trigger('consent')({ marketing: true }),
    ).rejects.toThrow('what window.CookieConsent answers');
  });
});
