import { startFlow } from '@walkeros/collector';
import type { WalkerOS, Collector } from '@walkeros/core';
import {
  createMockPush,
  getDataLayer,
  createDataLayerSource,
} from './test-utils';

describe('DataLayer Source - Integration', () => {
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

  test('complete gtag consent workflow', async () => {
    await createDataLayerSource(collector, {
      settings: {
        prefix: 'gtag',
        filter: (event: unknown) => {
          // Only allow consent events
          if (Array.isArray(event) && event[0] === 'consent') return false;
          return true;
        },
      },
    });

    // Simulate a complete consent workflow
    getDataLayer().push([
      'consent',
      'default',
      {
        ad_storage: 'denied',
        analytics_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      },
    ]);

    getDataLayer().push([
      'consent',
      'update',
      {
        analytics_storage: 'granted',
      },
    ]);

    getDataLayer().push([
      'consent',
      'update',
      {
        ad_storage: 'granted',
        ad_user_data: 'granted',
      },
    ]);

    // Non-consent events should be filtered out
    getDataLayer().push(['event', 'purchase', { value: 100 }]);
    getDataLayer().push({ event: 'custom_event', data: 'test' });

    expect(collectedEvents).toHaveLength(3);

    // Check all consent events were processed
    expect(collectedEvents[0]).toMatchObject({
      name: 'gtag consent default',
      data: {
        ad_storage: 'denied',
        analytics_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      },
    });

    expect(collectedEvents[1]).toMatchObject({
      name: 'gtag consent update',
      data: {
        analytics_storage: 'granted',
      },
    });

    expect(collectedEvents[2]).toMatchObject({
      data: {
        ad_storage: 'granted',
        ad_user_data: 'granted',
      },
    });
  });

  test('mixed event types with dataLayer prefix', async () => {
    await createDataLayerSource(collector); // Default prefix

    // Mix of different event types
    getDataLayer().push(['consent', 'update', { ad_storage: 'granted' }]);
    getDataLayer().push([
      'event',
      'purchase',
      { transaction_id: '123', value: 25.99 },
    ]);
    getDataLayer().push([
      'config',
      'GA_MEASUREMENT_ID',
      { send_page_view: false },
    ]);
    getDataLayer().push({ event: 'custom_event', user_id: 'user123' });
    getDataLayer().push(['set', { currency: 'EUR', country: 'DE' }]);

    expect(collectedEvents).toHaveLength(5);

    const eventNames = collectedEvents.map((e) => e.name);
    expect(eventNames).toEqual([
      'dataLayer consent update',
      'dataLayer purchase',
      'dataLayer config GA_MEASUREMENT_ID',
      'dataLayer custom_event',
      'dataLayer set custom',
    ]);
  });

  test('processes existing events and new events together', async () => {
    // Pre-populate dataLayer
    getDataLayer().push(['consent', 'default', { ad_storage: 'denied' }]);
    getDataLayer().push({ event: 'existing_event', data: 'test' });

    await createDataLayerSource(collector);

    // Add new events after initialization
    getDataLayer().push(['consent', 'update', { ad_storage: 'granted' }]);
    getDataLayer().push({ event: 'new_event', data: 'test2' });

    expect(collectedEvents).toHaveLength(4);

    // Check order: existing events first, then new events
    expect(collectedEvents[0].name).toBe('dataLayer consent default');
    expect(collectedEvents[1].name).toBe('dataLayer existing_event');
    expect(collectedEvents[2].name).toBe('dataLayer consent update');
    expect(collectedEvents[3].name).toBe('dataLayer new_event');
  });

  test('error handling and robustness', async () => {
    await createDataLayerSource(collector, {
      settings: {
        filter: (event: unknown) => {
          // Filter errors should not break processing
          if (Array.isArray(event) && event[0] === 'bad_filter') {
            throw new Error('Filter error');
          }
          return false; // Allow all others
        },
      },
    });

    // Good events
    getDataLayer().push(['consent', 'update', { ad_storage: 'granted' }]);

    // Event that causes filter error
    getDataLayer().push(['bad_filter', 'test']);

    // More good events after error
    getDataLayer().push({ event: 'after_error', data: 'test' });

    // Invalid events that should be ignored
    getDataLayer().push('string');
    getDataLayer().push(null);
    getDataLayer().push([]);

    // Final good event
    getDataLayer().push(['event', 'final', { data: 'last' }]);

    // Should have processed 3 good events (bad_filter is invalid gtag format)
    expect(collectedEvents).toHaveLength(3);

    const eventNames = collectedEvents.map((e) => e.name);
    expect(eventNames).toEqual([
      'dataLayer consent update',
      'dataLayer after_error',
      'dataLayer final',
    ]);
  });
});
