import { createCollector } from '@walkerOS/collector';
import { sourceDataLayer } from '../index';
import type { WalkerOS, Collector } from '@walkerOS/core';
import { createMockPush, getDataLayer } from './test-utils';

describe('DataLayer Source - Integration', () => {
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

  test('complete gtag consent workflow', () => {
    const source = sourceDataLayer({
      prefix: 'gtag',
      filter: (event) => {
        // Only allow consent events
        if (Array.isArray(event) && event[0] === 'consent') return false;
        return true;
      },
    });

    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

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
      event: 'gtag consent default',
      data: {
        event: 'consent default',
        ad_storage: 'denied',
        analytics_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      },
    });

    expect(collectedEvents[1]).toMatchObject({
      event: 'gtag consent update',
      data: {
        event: 'consent update',
        analytics_storage: 'granted',
      },
    });

    expect(collectedEvents[2]).toMatchObject({
      event: 'gtag consent update',
      data: {
        event: 'consent update',
        ad_storage: 'granted',
        ad_user_data: 'granted',
      },
    });
  });

  test('mixed event types with dataLayer prefix', () => {
    const source = sourceDataLayer(); // Default prefix

    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

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

    const eventNames = collectedEvents.map((e) => e.event);
    expect(eventNames).toEqual([
      'dataLayer consent update',
      'dataLayer purchase',
      'dataLayer config GA_MEASUREMENT_ID',
      'dataLayer custom_event',
      'dataLayer set custom',
    ]);
  });

  test('processes existing events and new events together', () => {
    // Pre-populate dataLayer
    getDataLayer().push(['consent', 'default', { ad_storage: 'denied' }]);
    getDataLayer().push({ event: 'existing_event', data: 'test' });

    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // Add new events after initialization
    getDataLayer().push(['consent', 'update', { ad_storage: 'granted' }]);
    getDataLayer().push({ event: 'new_event', data: 'test2' });

    expect(collectedEvents).toHaveLength(4);

    // Check order: existing events first, then new events
    expect(collectedEvents[0].event).toBe('dataLayer consent default');
    expect(collectedEvents[1].event).toBe('dataLayer existing_event');
    expect(collectedEvents[2].event).toBe('dataLayer consent update');
    expect(collectedEvents[3].event).toBe('dataLayer new_event');
  });

  test('error handling and robustness', () => {
    const source = sourceDataLayer({
      filter: (event) => {
        // Filter errors should not break processing
        if (Array.isArray(event) && event[0] === 'bad_filter') {
          throw new Error('Filter error');
        }
        return false; // Allow all others
      },
    });

    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

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

    const eventNames = collectedEvents.map((e) => e.event);
    expect(eventNames).toEqual([
      'dataLayer consent update',
      'dataLayer after_error',
      'dataLayer final',
    ]);
  });
});
