import { sourceDataLayer } from '../index';
import type { WalkerOS, Elb } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { createMockPush, getDataLayer } from './test-utils';

describe('DataLayer Source - Filtering', () => {
  let collectedEvents: WalkerOS.Event[];
  let mockElb: jest.MockedFunction<Elb.Fn>;

  beforeEach(async () => {
    window.dataLayer = [];
    collectedEvents = [];
    mockElb = createMockPush(collectedEvents);
  });

  test('processes all events when no filter is provided', async () => {
    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    getDataLayer().push({ event: 'event1' });
    getDataLayer().push(['event', 'event2']);
    getDataLayer().push({ event: 'event3' });

    expect(collectedEvents).toHaveLength(3);
  });

  test('filters out events based on custom filter function', async () => {
    // Filter to only allow events with 'allowed' in the name
    const filter = (event: unknown) => {
      if (isObject(event) && typeof event.event === 'string') {
        return !event.event.includes('allowed');
      }
      return true; // Skip non-object events
    };

    await sourceDataLayer({ settings: { filter } }, { elb: mockElb, window });

    getDataLayer().push({ event: 'allowed_event' });
    getDataLayer().push({ event: 'blocked_event' });
    getDataLayer().push({ event: 'another_allowed_event' });

    // Should only collect the 'allowed' events
    expect(collectedEvents).toHaveLength(2);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer allowed_event',
    });
    expect(collectedEvents[1]).toMatchObject({
      event: 'dataLayer another_allowed_event',
    });
  });

  test('handles filter function errors gracefully', async () => {
    // Filter function that throws an error
    const errorFilter = () => {
      throw new Error('Filter error');
    };

    await sourceDataLayer(
      { settings: { filter: errorFilter } },
      { elb: mockElb, window },
    );

    getDataLayer().push({ event: 'test_event' });

    // Should still process the event when filter throws
    expect(collectedEvents).toHaveLength(1);
  });

  test('filter receives correct event data', async () => {
    const testEvents: unknown[] = [];
    const filter = (event: unknown) => {
      testEvents.push(event);
      return false; // Allow all events
    };

    await sourceDataLayer({ settings: { filter } }, { elb: mockElb, window });

    const eventData = { event: 'test_event', custom: 'data' };
    getDataLayer().push(eventData);

    // Filter should receive the exact event data
    expect(testEvents).toHaveLength(1);
    expect(testEvents[0]).toEqual(eventData);
  });

  test('filters gtag-style events', async () => {
    const filter = (event: unknown) => {
      // Skip gtag consent events
      if (Array.isArray(event) && event[0] === 'consent') {
        return true;
      }
      return false;
    };

    await sourceDataLayer({ settings: { filter } }, { elb: mockElb, window });

    getDataLayer().push(['event', 'page_view']);
    getDataLayer().push(['consent', 'update', { ad_storage: 'granted' }]);
    getDataLayer().push(['event', 'purchase']);

    // Should only process non-consent events
    expect(collectedEvents).toHaveLength(2);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer page_view',
    });
    expect(collectedEvents[1]).toMatchObject({
      event: 'dataLayer purchase',
    });
  });

  test('filter applies to existing events during initialization', async () => {
    // Setup existing events
    window.dataLayer = [
      { event: 'allowed_existing' },
      { event: 'blocked_existing' },
    ];

    const filter = (event: unknown) => {
      if (isObject(event) && typeof event.event === 'string') {
        return !event.event.includes('allowed');
      }
      return true;
    };

    await sourceDataLayer({ settings: { filter } }, { elb: mockElb, window });

    // Should only process the allowed existing event
    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer allowed_existing',
    });
  });
});
