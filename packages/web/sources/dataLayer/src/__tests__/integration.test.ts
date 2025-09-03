import { sourceDataLayer } from '../index';
import type { WalkerOS, Elb } from '@walkeros/core';
import { createMockPush, getDataLayer } from './test-utils';

describe('DataLayer Source - Integration Tests', () => {
  let collectedEvents: WalkerOS.Event[];
  let mockElb: jest.MockedFunction<Elb.Fn>;

  beforeEach(async () => {
    delete window.dataLayer;
    delete window.customDataLayer;
    collectedEvents = [];
    mockElb = createMockPush(collectedEvents);
  });

  test('full integration with custom settings', async () => {
    await sourceDataLayer(
      {
        settings: {
          name: 'customDataLayer',
          prefix: 'custom',
          filter: (event) => {
            // For direct object events
            if (typeof event === 'object' && event && 'event' in event) {
              return !(event as { event: string }).event.startsWith('valid'); // return true to skip, false to allow
            }
            // For gtag array events ['event', 'event_name', params]
            if (
              Array.isArray(event) &&
              event.length >= 2 &&
              event[0] === 'event'
            ) {
              return !event[1].startsWith('valid'); // return true to skip, false to allow
            }
            return true; // Skip other formats
          },
        },
      },
      { elb: mockElb, window },
    );

    // Test custom dataLayer name
    expect(window.customDataLayer).toBeDefined();
    expect(Array.isArray(window.customDataLayer)).toBe(true);

    // Push events to custom dataLayer
    (window.customDataLayer as unknown[]).push({
      event: 'valid_event',
      data: 'test',
    });
    (window.customDataLayer as unknown[]).push({
      event: 'invalid_event',
      data: 'blocked',
    });
    (window.customDataLayer as unknown[]).push([
      'event',
      'valid_purchase',
      { value: 100 },
    ]);

    // Should only collect 'valid' events with custom prefix
    expect(collectedEvents).toHaveLength(2);
    expect(collectedEvents[0]).toMatchObject({
      event: 'custom valid_event',
      data: expect.objectContaining({
        event: 'valid_event',
        data: 'test',
      }),
    });
    expect(collectedEvents[1]).toMatchObject({
      event: 'custom valid_purchase',
      data: expect.objectContaining({
        event: 'valid_purchase',
        value: 100,
      }),
    });
  });

  test('handles multiple dataLayer instances', async () => {
    // Initialize first dataLayer
    await sourceDataLayer(
      { settings: { name: 'dataLayer1', prefix: 'dl1' } },
      { elb: mockElb, window },
    );

    // Initialize second dataLayer
    await sourceDataLayer(
      { settings: { name: 'dataLayer2', prefix: 'dl2' } },
      { elb: mockElb, window },
    );

    expect(window.dataLayer1).toBeDefined();
    expect(window.dataLayer2).toBeDefined();

    // Push to both dataLayers
    (window.dataLayer1 as unknown[]).push({ event: 'event_from_dl1' });
    (window.dataLayer2 as unknown[]).push({ event: 'event_from_dl2' });

    expect(collectedEvents).toHaveLength(2);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dl1 event_from_dl1',
    });
    expect(collectedEvents[1]).toMatchObject({
      event: 'dl2 event_from_dl2',
    });
  });

  test('processes existing events from multiple sources', async () => {
    // Setup existing events in different formats
    window.dataLayer = [
      { event: 'existing_direct', value: 1 },
      ['event', 'existing_gtag', { value: 2 }],
      ['consent', 'update', { ad_storage: 'granted' }],
      { event: 'another_direct', value: 3 },
    ];

    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    // Should process all existing events
    expect(collectedEvents).toHaveLength(4);

    // Check event types and data
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer existing_direct',
      data: expect.objectContaining({ value: 1 }),
    });
    expect(collectedEvents[1]).toMatchObject({
      event: 'dataLayer existing_gtag',
      data: expect.objectContaining({ value: 2 }),
    });
    expect(collectedEvents[2]).toMatchObject({
      event: 'dataLayer consent update',
      data: expect.objectContaining({ ad_storage: 'granted' }),
    });
    expect(collectedEvents[3]).toMatchObject({
      event: 'dataLayer another_direct',
      data: expect.objectContaining({ value: 3 }),
    });
  });

  test('maintains event order with rapid pushes', async () => {
    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    // Rapidly push multiple events
    for (let i = 0; i < 10; i++) {
      getDataLayer().push({ event: `rapid_event_${i}`, order: i });
    }

    expect(collectedEvents).toHaveLength(10);

    // Verify order is maintained
    for (let i = 0; i < 10; i++) {
      expect(collectedEvents[i]).toMatchObject({
        event: `dataLayer rapid_event_${i}`,
        data: expect.objectContaining({ order: i }),
      });
    }
  });

  test('handles complex nested data structures', async () => {
    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    const complexEvent = {
      event: 'complex_event',
      user: {
        id: '12345',
        properties: {
          name: 'Test User',
          preferences: ['pref1', 'pref2'],
        },
      },
      items: [
        {
          id: 'item1',
          metadata: {
            category: 'electronics',
            tags: ['new', 'popular'],
          },
        },
        {
          id: 'item2',
          metadata: {
            category: 'books',
            tags: ['bestseller'],
          },
        },
      ],
    };

    getDataLayer().push(complexEvent);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer complex_event',
      data: expect.objectContaining({
        event: 'complex_event',
        user: expect.objectContaining({
          id: '12345',
          properties: expect.objectContaining({
            name: 'Test User',
            preferences: ['pref1', 'pref2'],
          }),
        }),
        items: expect.arrayContaining([
          expect.objectContaining({
            id: 'item1',
            metadata: expect.objectContaining({
              category: 'electronics',
              tags: ['new', 'popular'],
            }),
          }),
          expect.objectContaining({
            id: 'item2',
            metadata: expect.objectContaining({
              category: 'books',
              tags: ['bestseller'],
            }),
          }),
        ]),
      }),
    });
  });
});
