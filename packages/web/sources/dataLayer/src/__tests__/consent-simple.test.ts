import { startFlow } from '@walkeros/collector';
import type { WalkerOS, Collector } from '@walkeros/core';
import {
  createMockPush,
  getDataLayer,
  createDataLayerSource,
} from './test-utils';

describe('DataLayer Source - Consent Mode (Simple)', () => {
  let collectedEvents: WalkerOS.Event[];
  let collector: Collector.Instance;

  beforeEach(async () => {
    window.dataLayer = [];
    collectedEvents = [];

    const mockPush = createMockPush(collectedEvents);

    ({ collector } = await startFlow({
      tagging: 2,
    }));

    collector.push = mockPush;
  });

  test('basic gtag consent update', async () => {
    await createDataLayerSource(collector);

    // Simulate: gtag('consent', 'update', { ad_storage: 'denied', analytics_storage: 'granted' })
    getDataLayer().push([
      'consent',
      'update',
      {
        ad_storage: 'denied',
        analytics_storage: 'granted',
      },
    ]);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      name: 'dataLayer consent update',
      data: {
        ad_storage: 'denied',
        analytics_storage: 'granted',
      },
    });
  });

  test('consent default should be processed', async () => {
    await createDataLayerSource(collector);

    // gtag('consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied' })
    getDataLayer().push([
      'consent',
      'default',
      {
        ad_storage: 'denied',
        analytics_storage: 'denied',
      },
    ]);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      name: 'dataLayer consent default',
      data: {
        ad_storage: 'denied',
        analytics_storage: 'denied',
      },
    });
  });

  test('processes existing consent events on initialization', async () => {
    // Pre-populate dataLayer with consent event
    getDataLayer().push([
      'consent',
      'update',
      {
        ad_storage: 'granted',
        analytics_storage: 'denied',
      },
    ]);

    await createDataLayerSource(collector);

    // Should have processed the existing event
    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      name: 'dataLayer consent update',
      data: {
        ad_storage: 'granted',
        analytics_storage: 'denied',
      },
    });
  });

  test('handles malformed consent events gracefully', async () => {
    await createDataLayerSource(collector);

    // These should be ignored
    getDataLayer().push(['consent', 'update', null]);
    getDataLayer().push(['consent', 'update']);
    getDataLayer().push(['consent']);

    expect(collectedEvents).toHaveLength(0);
  });

  test('processes multiple consent events', async () => {
    await createDataLayerSource(collector);

    // Multiple consent updates
    getDataLayer().push(['consent', 'update', { ad_storage: 'granted' }]);
    getDataLayer().push([
      'consent',
      'update',
      { analytics_storage: 'granted' },
    ]);
    getDataLayer().push(['consent', 'update', { ad_storage: 'denied' }]);

    expect(collectedEvents).toHaveLength(3);
    expect(collectedEvents[0].data).toMatchObject({
      ad_storage: 'granted',
    });
    expect(collectedEvents[1].data).toMatchObject({
      analytics_storage: 'granted',
    });
    expect(collectedEvents[2].data).toMatchObject({
      ad_storage: 'denied',
    });
  });

  test('with gtag prefix for backward compatibility', async () => {
    await createDataLayerSource(collector, { settings: { prefix: 'gtag' } });

    getDataLayer().push(['consent', 'update', { ad_storage: 'granted' }]);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0].name).toBe('gtag consent update');
  });
});
