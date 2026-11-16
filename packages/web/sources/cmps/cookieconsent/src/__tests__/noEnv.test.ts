import { resolve } from 'path';
import { startFlow } from '@walkeros/collector';
import { conformance } from '@walkeros/collector/dev';
import type { Destination } from '@walkeros/core';
import sourceCookieConsent from '../index';
import { examples, schemas } from '../dev';
import * as inputs from '../examples/inputs';
import { createCookieConsentApi } from '../examples/env';

// The source as the docs integrate it: the published default export with no
// env. The collector passes no `window`, so the source finds the page's own.

describe('CookieConsent source without env', () => {
  beforeEach(() => {
    jest.useRealTimers();
    Reflect.deleteProperty(window, 'CookieConsent');
  });

  afterEach(() => {
    Reflect.deleteProperty(window, 'CookieConsent');
  });

  it('opens a marketing destination on accept all and closes it on a change', async () => {
    const delivered: string[] = [];
    const spy: Destination.Instance = {
      type: 'spy',
      config: { consent: { marketing: true } },
      push: (event) => void delivered.push(event.name),
    };
    const { collector } = await startFlow({
      sources: { consent: { code: sourceCookieConsent } },
      destinations: { spy: { code: spy } },
    });
    const settle = () => new Promise((done) => setTimeout(done, 0));

    try {
      // Before a choice the event waits in the destination's consent queue
      await collector.push({ name: 'page view' });
      await settle();
      expect(delivered).toEqual([]);

      Object.assign(window, {
        CookieConsent: createCookieConsentApi(inputs.acceptAll),
      });
      window.dispatchEvent(new CustomEvent('cc:onConsent'));
      await settle();
      expect(collector.consent).toMatchObject({ marketing: true });
      expect(delivered).toEqual(['page view']);

      Object.assign(window, {
        CookieConsent: createCookieConsentApi(inputs.rejectAll),
      });
      window.dispatchEvent(new CustomEvent('cc:onChange'));
      await settle();
      await collector.push({ name: 'product view' });
      await settle();
      expect(collector.consent).toMatchObject({ marketing: false });
      expect(delivered).toEqual(['page view']);
    } finally {
      await collector.command('shutdown');
    }
  });

  it('passes the source conformance profile', async () => {
    await expect(
      conformance('source', sourceCookieConsent, {
        profile: 'source',
        examples: examples.step,
        schema: schemas.settings,
        settings: {},
        root: resolve(__dirname, '../..'),
        createTrigger: examples.createTrigger,
      }),
    ).resolves.toBeUndefined();
  });
});
