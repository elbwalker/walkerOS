/**
 * @jest-environment jsdom
 */

import { createCollector } from '@walkerOS/collector';
import { sourceDataLayer } from '../index';
import type { WalkerOS } from '@walkerOS/core';
import { isObject } from '@walkerOS/core';
import { createMockPush, getDataLayer } from './test-utils';

describe('DataLayer Source - Filtering', () => {
  let collectedEvents: WalkerOS.Event[];
  let collector: WalkerOS.Collector;

  beforeEach(async () => {
    window.dataLayer = [];
    collectedEvents = [];

    const mockPush = createMockPush(collectedEvents);

    ({ collector } = await createCollector({
      tagging: 2,
      sources: [],
    }));

    collector.push = mockPush;
  });

  test('basic filter functionality', () => {
    const mockFilter = jest.fn();

    const source = sourceDataLayer({
      filter: (event) => {
        mockFilter(event);
        return isObject(event) && event.event === 'filtered_out';
      },
    });

    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // These should be processed
    getDataLayer().push({ event: 'allowed_event', data: 'test' });
    getDataLayer().push(['consent', 'update', { ad_storage: 'granted' }]);

    // This should be filtered out
    getDataLayer().push({ event: 'filtered_out', data: 'test' });

    expect(mockFilter).toHaveBeenCalledTimes(3);
    expect(collectedEvents).toHaveLength(2);
    expect(collectedEvents[0].event).toBe('dataLayer allowed_event');
    expect(collectedEvents[1].event).toBe('dataLayer consent update');
  });

  test('filter with consent events only', () => {
    const source = sourceDataLayer({
      filter: (event) => {
        // Only allow consent events (filter out everything else)
        if (Array.isArray(event) && event[0] === 'consent') return false;
        return true; // Filter out non-consent events
      },
    });

    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

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
    expect(collectedEvents[0].event).toBe('dataLayer consent update');
    expect(collectedEvents[1].event).toBe('dataLayer consent default');
  });

  test('filter processes existing events', () => {
    // Pre-populate with mixed events
    getDataLayer().push({ event: 'existing_good', data: 'test' });
    getDataLayer().push({ event: 'existing_bad', data: 'test' });
    getDataLayer().push(['consent', 'update', { ad_storage: 'granted' }]);

    const source = sourceDataLayer({
      filter: (event) => {
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
    });

    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // Should have processed 2 events (filtered out 'existing_bad')
    expect(collectedEvents).toHaveLength(2);
    expect(collectedEvents[0].event).toBe('dataLayer existing_good');
    expect(collectedEvents[1].event).toBe('dataLayer consent update');
  });

  test('handles filter errors gracefully', () => {
    const source = sourceDataLayer({
      filter: () => {
        throw new Error('Filter error');
      },
    });

    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // Should still process events despite filter error
    getDataLayer().push({ event: 'test_event', data: 'test' });

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0].event).toBe('dataLayer test_event');
  });

  test('filter return value determines processing', () => {
    let shouldFilter = false;

    const source = sourceDataLayer({
      filter: () => shouldFilter,
    });

    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // First event should be processed (filter returns false)
    getDataLayer().push({ event: 'event1', data: 'test' });

    // Change filter behavior
    shouldFilter = true;

    // Second event should be filtered out (filter returns true)
    getDataLayer().push({ event: 'event2', data: 'test' });

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0].event).toBe('dataLayer event1');
  });
});
