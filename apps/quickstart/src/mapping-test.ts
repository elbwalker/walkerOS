import { startFlow } from '@walkeros/collector';
import type { Destination, WalkerOS } from '@walkeros/core';

/**
 * Exercises the walkerOS mapping system end to end and returns the mapped
 * output each destination observes.
 *
 * The destination flow renames events and reshapes their data through
 * destination-level `config.mapping`: product view → view_item, product add →
 * add_to_cart, and order complete → purchase (with a calculated tax). Mapping
 * transforms the payload delivered on the push `context.data`; the original
 * `event.data` is left untouched, so the captured `data` below reads
 * `context.data`, the actual mapped output.
 *
 * The second flow shows that source-level `config.mapping` does NOT apply on the
 * direct-`elb` path: `startFlow` returns the collector's `elb`, which pushes
 * straight into the collector and bypasses the custom source, so `user login`
 * stays `user login`. Source mapping only runs when an event enters through the
 * source itself.
 */

export interface MappedRecord {
  name: string;
  data: Destination.Data;
  rule?: string;
}

export interface SourceRecord {
  name: string;
  data: WalkerOS.Properties;
}

export interface MappingTestResult {
  destination: MappedRecord[];
  source: SourceRecord[];
}

export async function testMapping(): Promise<MappingTestResult> {
  const destination: MappedRecord[] = [];
  const source: SourceRecord[] = [];

  const { elb } = await startFlow({
    destinations: {
      console: {
        code: {
          type: 'console',
          config: {},
          push: async (event, context) => {
            destination.push({
              name: event.name,
              data: context.data,
              rule: context.rule?.name,
            });
          },
        },
        config: {
          // Destination-level mapping
          mapping: {
            product: {
              view: {
                name: 'view_item', // Rename event
                data: {
                  map: {
                    item_id: 'data.id',
                    item_name: 'data.name',
                    price: 'data.price',
                    currency: { value: 'EUR' }, // Static value
                  },
                },
              },
              add: {
                name: 'add_to_cart',
                data: {
                  map: {
                    item_id: 'data.id',
                    quantity: 'data.quantity',
                  },
                },
              },
            },
            order: {
              complete: {
                name: 'purchase',
                data: {
                  map: {
                    transaction_id: 'data.id',
                    value: 'data.total',
                    currency: { value: 'EUR' },
                    // Custom function
                    tax: {
                      fn: (value) => {
                        const event = value as WalkerOS.Event;
                        const total = (event.data?.total as number) || 0;
                        return total * 0.1;
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // Event without mapping
  await elb('page view', { title: 'Home Page' });

  // Product view mapped to view_item
  await elb('product view', {
    id: 'P123',
    name: 'Premium Laptop',
    price: 999.99,
  });

  // Product add mapped to add_to_cart
  await elb('product add', {
    id: 'P123',
    quantity: 2,
  });

  // Order complete with calculated tax
  await elb('order complete', {
    id: 'ORDER-789',
    total: 1000,
  });

  const { elb: sourceElb } = await startFlow({
    sources: {
      custom: {
        code: async (context) => ({
          type: 'custom',
          config: context.config,
          push: (event: WalkerOS.Event, _data?: WalkerOS.Properties) =>
            context.env.elb(event),
        }),
        config: {
          // Source-level mapping
          mapping: {
            user: {
              login: {
                name: 'user_signed_in',
                data: {
                  map: {
                    user_id: 'data.id',
                    method: 'data.loginMethod',
                  },
                },
              },
            },
          },
        },
      },
    },
    destinations: {
      console: {
        code: {
          type: 'console',
          config: {},
          push: async (event) => {
            source.push({ name: event.name, data: event.data });
          },
        },
        config: {},
      },
    },
  });

  await sourceElb('user login', {
    id: 'user-456',
    loginMethod: 'google',
  });

  return { destination, source };
}

export default testMapping;
