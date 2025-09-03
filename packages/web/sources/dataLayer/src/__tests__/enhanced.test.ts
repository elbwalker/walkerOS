import { sourceDataLayer } from '../index';
import type { WalkerOS, Elb } from '@walkeros/core';
import { createMockPush, getDataLayer } from './test-utils';

describe('DataLayer Source - Enhanced with gtag support', () => {
  let collectedEvents: WalkerOS.Event[];
  let mockElb: jest.MockedFunction<Elb.Fn>;

  beforeEach(async () => {
    // Clear any existing dataLayer
    delete window.dataLayer;
    collectedEvents = [];

    // Create a simple synchronous mock
    mockElb = createMockPush(collectedEvents);
  });

  test('handles gtag consent events', async () => {
    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    // Push a gtag consent event
    getDataLayer().push([
      'consent',
      'update',
      {
        ad_storage: 'granted',
        analytics_storage: 'granted',
      },
    ]);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer consent update',
      data: expect.objectContaining({
        event: 'consent update',
        ad_storage: 'granted',
        analytics_storage: 'granted',
      }),
    });
  });

  test('handles gtag config events', async () => {
    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    // Push a gtag config event
    getDataLayer().push([
      'config',
      'GA_MEASUREMENT_ID',
      {
        page_title: 'Custom Title',
        custom_map: { dimension1: 'user_type' },
      },
    ]);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer config GA_MEASUREMENT_ID',
      data: expect.objectContaining({
        event: 'config GA_MEASUREMENT_ID',
        page_title: 'Custom Title',
        custom_map: { dimension1: 'user_type' },
      }),
    });
  });

  test('handles gtag set events', async () => {
    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    // Push a gtag set event
    getDataLayer().push([
      'set',
      {
        user_id: '12345',
        custom_parameter: 'value',
      },
    ]);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer set custom',
      data: expect.objectContaining({
        event: 'set custom',
        user_id: '12345',
        custom_parameter: 'value',
      }),
    });
  });

  test('handles gtag event with parameters', async () => {
    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    // Push a gtag event with parameters
    getDataLayer().push([
      'event',
      'purchase',
      {
        transaction_id: '12345',
        value: 25.42,
        currency: 'USD',
        items: [
          {
            item_id: 'SKU_12345',
            item_name: 'Test Product',
            price: 25.42,
            quantity: 1,
          },
        ],
      },
    ]);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer purchase',
      data: expect.objectContaining({
        event: 'purchase',
        transaction_id: '12345',
        value: 25.42,
        currency: 'USD',
        items: expect.arrayContaining([
          expect.objectContaining({
            item_id: 'SKU_12345',
            item_name: 'Test Product',
          }),
        ]),
      }),
    });
  });

  test('handles mixed event formats in sequence', async () => {
    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    // Push multiple different event formats
    getDataLayer().push({ event: 'custom_event', data: 'value1' });
    getDataLayer().push([
      'event',
      'page_view',
      { page_location: 'https://example.com' },
    ]);
    getDataLayer().push([
      'consent',
      'update',
      { analytics_storage: 'granted' },
    ]);

    expect(collectedEvents).toHaveLength(3);

    // Check first event (direct object)
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer custom_event',
      data: expect.objectContaining({
        event: 'custom_event',
        data: 'value1',
      }),
    });

    // Check second event (gtag event)
    expect(collectedEvents[1]).toMatchObject({
      event: 'dataLayer page_view',
      data: expect.objectContaining({
        event: 'page_view',
        page_location: 'https://example.com',
      }),
    });

    // Check third event (gtag consent)
    expect(collectedEvents[2]).toMatchObject({
      event: 'dataLayer consent update',
      data: expect.objectContaining({
        event: 'consent update',
        analytics_storage: 'granted',
      }),
    });
  });

  test('ignores invalid gtag formats', async () => {
    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    // Push invalid formats that should be ignored
    getDataLayer().push(['unknown_command', 'param']);
    getDataLayer().push(['consent']); // Missing required parameters
    getDataLayer().push(['event']); // Missing event name
    getDataLayer().push('invalid_string');
    getDataLayer().push(null);
    getDataLayer().push(123);

    // No events should be collected
    expect(collectedEvents).toHaveLength(0);
  });
});
