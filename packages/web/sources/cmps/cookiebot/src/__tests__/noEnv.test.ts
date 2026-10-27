import { resolve } from 'path';
import { startFlow } from '@walkeros/collector';
import { conformance } from '@walkeros/collector/dev';
import type { Destination } from '@walkeros/core';
import sourceCookiebot from '../index';
import { examples, schemas } from '../dev';
import * as inputs from '../examples/inputs';

// The source as the docs integrate it: the published default export with no
// env. The collector passes no `window`, so the source finds the page's own.

describe('Cookiebot source without env', () => {
  beforeEach(() => {
    jest.useRealTimers();
    Reflect.deleteProperty(window, 'Cookiebot');
  });

  afterEach(() => {
    Reflect.deleteProperty(window, 'Cookiebot');
  });

  it('opens a marketing destination on allow all and closes it on necessary only', async () => {
    const delivered: string[] = [];
    const spy: Destination.Instance = {
      type: 'spy',
      config: { consent: { marketing: true } },
      push: (event) => void delivered.push(event.name),
    };
    const { collector } = await startFlow({
      sources: { consent: { code: sourceCookiebot } },
      destinations: { spy: { code: spy } },
    });
    const settle = () => new Promise((done) => setTimeout(done, 0));

    try {
      // Before a choice the event waits in the destination's consent queue
      await collector.push({ name: 'page view' });
      await settle();
      expect(delivered).toEqual([]);

      Object.assign(window, { Cookiebot: inputs.fullConsent });
      window.dispatchEvent(new Event('CookiebotOnAccept'));
      await settle();
      expect(collector.consent).toMatchObject({ marketing: true });
      expect(delivered).toEqual(['page view']);

      Object.assign(window, { Cookiebot: inputs.necessaryOnly });
      window.dispatchEvent(new Event('CookiebotOnDecline'));
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
      conformance('source', sourceCookiebot, {
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
