import { getMappingEvent, getMappingValue } from '@walkeros/core';
import type { WalkerOS, Mapping } from '@walkeros/core';

// These tests validate the actual mapping logic that LiveCode displays
describe('Mapping Examples (LiveCode Scenarios)', () => {
  test('Basic Event Mapping - entity action match', async () => {
    const event: WalkerOS.Event = {
      name: 'product view',
      data: { id: 'P123', price: 99 },
      timestamp: Date.now(),
      timing: 0,
      group: 'test',
      count: 1,
      id: '1',
      trigger: 'manual',
      entity: 'product',
      action: 'view',
      source: { type: 'test', id: 'test' },
      context: {},
      consent: {},
      globals: {},
      user: {},
      nested: [],
    };

    const mapping: Mapping.Config = {
      product: {
        view: { name: 'view_item' },
      },
    };

    const { eventMapping } = await getMappingEvent(event, mapping);

    expect(eventMapping?.name).toBe('view_item');
  });

  test('Data Transformation - map values from event', async () => {
    const event: WalkerOS.Event = {
      name: 'product view',
      data: { id: 'P123', price: 99.99 },
      timestamp: Date.now(),
      timing: 0,
      group: 'test',
      count: 1,
      id: '1',
      trigger: 'manual',
      entity: 'product',
      action: 'view',
      source: { type: 'test', id: 'test' },
      context: {},
      consent: {},
      globals: {},
      user: {},
      nested: [],
    };

    const mapping: Mapping.Config = {
      product: {
        view: {
          name: 'view_item',
          data: {
            map: {
              item_id: 'data.id',
              value: 'data.price',
              currency: { value: 'USD' },
            },
          },
        },
      },
    };

    const { eventMapping } = await getMappingEvent(event, mapping);

    const result = await getMappingValue(event, eventMapping.data, {
      collector: { id: 'test' } as any,
    });

    expect(result).toEqual({
      item_id: 'P123',
      value: 99.99,
      currency: 'USD',
    });
  });

  test('Wildcard Mapping - matches any action', async () => {
    const event: WalkerOS.Event = {
      name: 'product add',
      data: {},
      timestamp: Date.now(),
      timing: 0,
      group: 'test',
      count: 1,
      id: '1',
      trigger: 'manual',
      entity: 'product',
      action: 'add',
      source: { type: 'test', id: 'test' },
      context: {},
      consent: {},
      globals: {},
      user: {},
      nested: [],
    };

    const mapping: Mapping.Config = {
      product: {
        '*': { name: 'product_interaction' },
      },
    };

    const { eventMapping } = await getMappingEvent(event, mapping);

    expect(eventMapping?.name).toBe('product_interaction');
  });

  test('Custom Function Mapping - transform with fn', async () => {
    const event: WalkerOS.Event = {
      name: 'order complete',
      data: { id: 'O123', total: 150.5, items: 3 },
      timestamp: Date.now(),
      timing: 0,
      group: 'test',
      count: 1,
      id: '1',
      trigger: 'manual',
      entity: 'order',
      action: 'complete',
      source: { type: 'test', id: 'test' },
      context: {},
      consent: {},
      globals: {},
      user: {},
      nested: [],
    };

    const mapping: Mapping.Config = {
      order: {
        complete: {
          name: 'purchase',
          data: {
            map: {
              order_id: 'data.id',
              revenue: 'data.total',
              is_high_value: {
                fn: (e: WalkerOS.Event) => (e.data.total as number) > 100,
              },
            },
          },
        },
      },
    };

    const { eventMapping } = await getMappingEvent(event, mapping);

    const result = await getMappingValue(event, eventMapping.data, {
      collector: { id: 'test' } as any,
    });

    expect(result).toEqual({
      order_id: 'O123',
      revenue: 150.5,
      is_high_value: true,
    });
  });

  test('No Mapping Match - returns undefined', async () => {
    const event: WalkerOS.Event = {
      name: 'custom event',
      data: {},
      timestamp: Date.now(),
      timing: 0,
      group: 'test',
      count: 1,
      id: '1',
      trigger: 'manual',
      entity: 'custom',
      action: 'event',
      source: { type: 'test', id: 'test' },
      context: {},
      consent: {},
      globals: {},
      user: {},
      nested: [],
    };

    const mapping: Mapping.Config = {
      product: {
        view: { name: 'view_item' },
      },
    };

    const { eventMapping } = await getMappingEvent(event, mapping);

    expect(eventMapping).toBeUndefined();
  });
});
