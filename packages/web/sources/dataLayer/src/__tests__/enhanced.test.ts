import { createCollector } from '@walkeros/collector';
import type { WalkerOS, Collector } from '@walkeros/core';
import {
  createMockPush,
  getDataLayer,
  createDataLayerSource,
} from './test-utils';

describe('DataLayer Source - Enhanced with gtag support', () => {
  let collectedEvents: WalkerOS.Event[];
  let collector: Collector.Instance;

  beforeEach(async () => {
    // Clear any existing dataLayer
    delete window.dataLayer;
    collectedEvents = [];

    // Create a simple synchronous mock
    const mockPush = createMockPush(collectedEvents);

    // Initialize collector
    ({ collector } = await createCollector({
      tagging: 2,
    }));

    // Override push with synchronous mock
    collector.push = mockPush;
  });

  test('handles gtag consent events', async () => {
    await createDataLayerSource(collector);

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
      name: 'dataLayer consent update',
      data: {
        ad_storage: 'granted',
        analytics_storage: 'denied',
      },
    });
  });

  test('handles gtag event calls', async () => {
    await createDataLayerSource(collector);

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
      name: 'dataLayer purchase',
      data: {
        transaction_id: '123',
        value: 25.99,
      },
    });
  });

  test('handles gtag config calls', async () => {
    await createDataLayerSource(collector);

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
      name: 'dataLayer config GA_MEASUREMENT_ID',
      data: {
        send_page_view: false,
      },
    });
  });

  test('handles gtag set calls with parameter', async () => {
    await createDataLayerSource(collector);

    // Simulate gtag('set', 'currency', { value: 'EUR' })
    getDataLayer().push(['set', 'currency', { value: 'EUR' }]);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      name: 'dataLayer set currency',
      data: {
        value: 'EUR',
      },
    });
  });

  test('handles gtag set calls with object', async () => {
    await createDataLayerSource(collector);

    // Simulate gtag('set', { currency: 'EUR', country: 'DE' })
    getDataLayer().push(['set', { currency: 'EUR', country: 'DE' }]);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      name: 'dataLayer set custom',
      data: {
        currency: 'EUR',
        country: 'DE',
      },
    });
  });

  test('handles direct dataLayer objects', async () => {
    await createDataLayerSource(collector);

    // Direct object push
    getDataLayer().push({ event: 'custom_event', user_id: 'user123' });

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      name: 'dataLayer custom_event',
      data: {
        user_id: 'user123',
      },
    });
  });

  test('ignores invalid gtag commands', async () => {
    await createDataLayerSource(collector);

    // Invalid commands should be ignored
    getDataLayer().push(['get', 'some_value']); // get command is not supported
    getDataLayer().push(['unknown_command', 'value']);
    getDataLayer().push(['event']); // missing required parameters

    expect(collectedEvents).toHaveLength(0);
  });

  test('handles malformed events gracefully', async () => {
    await createDataLayerSource(collector);

    // These should all be ignored
    getDataLayer().push('string');
    getDataLayer().push(123);
    getDataLayer().push(null);
    getDataLayer().push([]);
    getDataLayer().push(['consent']); // missing action

    expect(collectedEvents).toHaveLength(0);
  });

  test('processes gtag arguments object format', async () => {
    await createDataLayerSource(collector);

    // Simulate actual gtag function call arguments
    const gtagArgs = (function (..._params) {
      return arguments;
    })('consent', 'update', { ad_storage: 'granted' });
    getDataLayer().push(gtagArgs);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      name: 'dataLayer consent update',
      data: {
        ad_storage: 'granted',
      },
    });
  });
});
