import { resolve } from 'path';
import { startFlow } from '@walkeros/collector';
import { conformance } from '@walkeros/collector/dev';
import type { Destination, WalkerOS } from '@walkeros/core';
import sourceDataLayer from '../index';
import { examples, schemas } from '../dev';

// The source as the docs integrate it: the published default export with no
// env. The collector passes no `window`, so the source finds the page's own.

describe('DataLayer source without env', () => {
  beforeEach(() => {
    jest.useRealTimers();
    window.dataLayer = undefined;
  });

  afterEach(() => {
    window.dataLayer = undefined;
  });

  it('captures a dataLayer.push', async () => {
    const delivered: WalkerOS.Event[] = [];
    const spy: Destination.Instance = {
      type: 'spy',
      config: {},
      push: (event) => void delivered.push(event),
    };
    const { collector } = await startFlow({
      sources: { dataLayer: { code: sourceDataLayer } },
      destinations: { spy: { code: spy } },
    });
    try {
      window.dataLayer?.push({ event: 'purchase', value: 25.42 });
      await new Promise((settle) => setTimeout(settle, 0));
      expect(delivered.map((event) => event.name)).toEqual([
        'dataLayer purchase',
      ]);
    } finally {
      await collector.command('shutdown');
    }
  });

  it('passes the source conformance profile', async () => {
    await expect(
      conformance('source', sourceDataLayer, {
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
