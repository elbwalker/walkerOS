/**
 * @jest-environment jsdom
 */

import { createCollector } from '@walkerOS/collector';
import { sourceDataLayer } from '../index';
import type { WalkerOS } from '@walkerOS/core';
import { createMockPush, getDataLayer } from './test-utils';

describe('DataLayer Source - Enhanced with gtag support', () => {
  let collectedEvents: WalkerOS.Event[];
  let collector: WalkerOS.Collector;

  beforeEach(async () => {
    // Clear any existing dataLayer
    delete window.dataLayer;
    collectedEvents = [];

    // Create a simple synchronous mock
    const mockPush = createMockPush(collectedEvents);

    // Initialize collector
    ({ collector } = await createCollector({
      tagging: 2,
      sources: [],
    }));

    // Override push with synchronous mock
    collector.push = mockPush;
  });

  test('handles gtag consent events', () => {
    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // Simulate gtag('consent', 'update', { ad_storage: 'granted', analytics_storage: 'denied' })
    getDataLayer().push([
      'consent',
      'update',
      {
        ad_storage: 'granted',
        analytics_storage: 'denied',
      },
    ]);

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

  test('handles gtag event calls', () => {
    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // Simulate gtag('event', 'purchase', { transaction_id: '123', value: 25.99 })
    getDataLayer().push([
      'event',
      'purchase',
      {
        transaction_id: '123',
        value: 25.99,
      },
    ]);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer purchase',
      data: {
        event: 'purchase',
        transaction_id: '123',
        value: 25.99,
      },
    });
  });

  test('handles gtag config calls', () => {
    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // Simulate gtag('config', 'GA_MEASUREMENT_ID', { send_page_view: false })
    getDataLayer().push([
      'config',
      'GA_MEASUREMENT_ID',
      {
        send_page_view: false,
      },
    ]);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer config GA_MEASUREMENT_ID',
      data: {
        event: 'config GA_MEASUREMENT_ID',
        send_page_view: false,
      },
    });
  });

  test('handles gtag set calls with parameter', () => {
    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // Simulate gtag('set', 'currency', { value: 'EUR' })
    getDataLayer().push(['set', 'currency', { value: 'EUR' }]);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer set currency',
      data: {
        event: 'set currency',
        value: 'EUR',
      },
    });
  });

  test('handles gtag set calls with object', () => {
    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // Simulate gtag('set', { currency: 'EUR', country: 'DE' })
    getDataLayer().push(['set', { currency: 'EUR', country: 'DE' }]);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer set custom',
      data: {
        event: 'set custom',
        currency: 'EUR',
        country: 'DE',
      },
    });
  });

  test('handles direct dataLayer objects', () => {
    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // Direct object push
    getDataLayer().push({ event: 'custom_event', user_id: 'user123' });

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer custom_event',
      data: {
        event: 'custom_event',
        user_id: 'user123',
      },
    });
  });

  test('ignores invalid gtag commands', () => {
    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // Invalid commands should be ignored
    getDataLayer().push(['get', 'some_value']); // get command is not supported
    getDataLayer().push(['unknown_command', 'value']);
    getDataLayer().push(['event']); // missing required parameters

    expect(collectedEvents).toHaveLength(0);
  });

  test('handles malformed events gracefully', () => {
    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // These should all be ignored
    getDataLayer().push('string');
    getDataLayer().push(123);
    getDataLayer().push(null);
    getDataLayer().push([]);
    getDataLayer().push(['consent']); // missing action

    expect(collectedEvents).toHaveLength(0);
  });

  test('processes gtag arguments object format', () => {
    const source = sourceDataLayer();
    if (source.init) {
      source.init(collector, { settings: source.settings ?? {} });
    }

    // Simulate actual gtag function call arguments
    const gtagArgs = (function (..._params) {
      return arguments;
    })('consent', 'update', { ad_storage: 'granted' });
    getDataLayer().push(gtagArgs);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer consent update',
      data: {
        event: 'consent update',
        ad_storage: 'granted',
      },
    });
  });
});
