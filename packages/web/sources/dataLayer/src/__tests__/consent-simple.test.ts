import { createCollector } from '@walkerOS/collector';
import { sourceDataLayer } from '../index';
import type { WalkerOS } from '@walkerOS/core';
import { createMockPush, getDataLayer } from './test-utils';

describe('DataLayer Source - Consent Mode (Simple)', () => {
  let collectedEvents: WalkerOS.Event[];
  let collector: Collector.Instance;

  beforeEach(async () => {
    window.dataLayer = [];
    collectedEvents = [];

    const mockPush = createMockPush(collectedEvents);

    ({ collector } = await createCollector({
      tagging: 2,
    }));

    collector.push = mockPush;
  });

  test('basic gtag consent update', () => {
    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

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
      event: 'dataLayer consent update',
      data: {
        event: 'consent update',
        ad_storage: 'denied',
        analytics_storage: 'granted',
      },
    });
  });

  test('consent default should be processed', () => {
    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

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
      event: 'dataLayer consent default',
      data: {
        event: 'consent default',
        ad_storage: 'denied',
        analytics_storage: 'denied',
      },
    });
  });

  test('processes existing consent events on initialization', () => {
    // Pre-populate dataLayer with consent event
    getDataLayer().push([
      'consent',
      'update',
      {
        ad_storage: 'granted',
        analytics_storage: 'denied',
      },
    ]);

    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // Should have processed the existing event
    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer consent update',
      data: {
        event: 'consent update',
        ad_storage: 'granted',
        analytics_storage: 'denied',
      },
    });
  });

  test('handles malformed consent events gracefully', () => {
    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // These should be ignored
    getDataLayer().push(['consent', 'update', null]);
    getDataLayer().push(['consent', 'update']);
    getDataLayer().push(['consent']);

    expect(collectedEvents).toHaveLength(0);
  });

  test('processes multiple consent events', () => {
    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

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
      event: 'consent update',
      ad_storage: 'granted',
    });
    expect(collectedEvents[1].data).toMatchObject({
      event: 'consent update',
      analytics_storage: 'granted',
    });
    expect(collectedEvents[2].data).toMatchObject({
      event: 'consent update',
      ad_storage: 'denied',
    });
  });

  test('with gtag prefix for backward compatibility', () => {
    const source = sourceDataLayer({ prefix: 'gtag' });
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    getDataLayer().push(['consent', 'update', { ad_storage: 'granted' }]);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0].event).toBe('gtag consent update');
  });
});
