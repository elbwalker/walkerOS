import { createCollector } from '@walkeros/collector';
import { sourceDataLayer } from '../index';
import type { WalkerOS, Collector } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import {
  createMockPush,
  getDataLayer,
  createDataLayerSource,
} from './test-utils';

describe('DataLayer Source - Filtering', () => {
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

  test('basic filter functionality', async () => {
    const mockFilter = jest.fn();

    await createDataLayerSource(collector, {
      settings: {
        filter: (event: unknown) => {
          mockFilter(event);
          return isObject(event) && event.event === 'filtered_out';
        },
      },
    });

    // These should be processed
    getDataLayer().push({ event: 'allowed_event', data: 'test' });
    getDataLayer().push(['consent', 'update', { ad_storage: 'granted' }]);

    // This should be filtered out
    getDataLayer().push({ event: 'filtered_out', data: 'test' });

    expect(mockFilter).toHaveBeenCalledTimes(3);
    expect(collectedEvents).toHaveLength(2);
    expect(collectedEvents[0].name).toBe('dataLayer allowed_event');
    expect(collectedEvents[1].name).toBe('dataLayer consent update');
  });

  test('filter with consent events only', async () => {
    await createDataLayerSource(collector, {
      settings: {
        filter: (event: unknown) => {
          // Only allow consent events (filter out everything else)
          if (Array.isArray(event) && event[0] === 'consent') return false;
          return true; // Filter out non-consent events
        },
      },
    });

    // Only consent events should pass
    getDataLayer().push(['consent', 'update', { ad_storage: 'granted' }]);
    getDataLayer().push({ event: 'purchase', value: 100 });
    getDataLayer().push(['event', 'click', { element: 'button' }]);
    getDataLayer().push([
      'consent',
      'default',
      { analytics_storage: 'denied' },
    ]);

    expect(collectedEvents).toHaveLength(2);
    expect(collectedEvents[0].name).toBe('dataLayer consent update');
    expect(collectedEvents[1].name).toBe('dataLayer consent default');
  });

  test('filter processes existing events', async () => {
    // Pre-populate with mixed events
    getDataLayer().push({ event: 'existing_good', data: 'test' });
    getDataLayer().push({ event: 'existing_bad', data: 'test' });
    getDataLayer().push(['consent', 'update', { ad_storage: 'granted' }]);

    await createDataLayerSource(collector, {
      settings: {
        filter: (event: unknown) => {
          // Filter out events with 'bad' in the name
          if (
            isObject(event) &&
            typeof event.event === 'string' &&
            event.event.includes('bad')
          ) {
            return true;
          }
          return false;
        },
      },
    });

    // Should have processed 2 events (filtered out 'existing_bad')
    expect(collectedEvents).toHaveLength(2);
    expect(collectedEvents[0].name).toBe('dataLayer existing_good');
    expect(collectedEvents[1].name).toBe('dataLayer consent update');
  });

  test('handles filter errors gracefully', async () => {
    await createDataLayerSource(collector, {
      settings: {
        filter: (event: unknown) => {
          throw new Error('Filter error');
        },
      },
    });

    // Should still process events despite filter error
    getDataLayer().push({ event: 'test_event', data: 'test' });

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0].name).toBe('dataLayer test_event');
  });

  test('filter return value determines processing', async () => {
    let shouldFilter = false;

    await createDataLayerSource(collector, {
      settings: {
        filter: (event: unknown) => shouldFilter,
      },
    });

    // First event should be processed (filter returns false)
    getDataLayer().push({ event: 'event1', data: 'test' });

    // Change filter behavior
    shouldFilter = true;

    // Second event should be filtered out (filter returns true)
    getDataLayer().push({ event: 'event2', data: 'test' });

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0].name).toBe('dataLayer event1');
  });
});
