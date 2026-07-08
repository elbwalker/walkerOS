import { startFlow } from '@walkeros/collector';
import { Source } from '@walkeros/core';
import type { Destination, WalkerOS } from '@walkeros/core';

/**
 * Exercises the walkerOS mapping system end to end and returns the mapped
 * output each destination observes.
 *
 * Destination-level `config.mapping` renames events and reshapes their data on
 * the way to a destination: product view → view_item, product add →
 * add_to_cart, order complete → purchase (with a calculated tax). The mapped
 * payload is delivered on the push `context.data`; the canonical `event.data`
 * is left untouched, so the captured `data` below reads `context.data`.
 *
 * Source-level `config.mapping` normalizes a raw event before it reaches the
 * collector: it renames `user login` to the canonical `user authenticated`
 * (an entity-action name, with a space) and uses `policy` to add a normalized
 * field to the event data. Source mapping applies only when an event enters
 * through the source, so the event is pushed via the source instance
 * (`getSource`), not the collector's top-level `elb`, which would bypass it.
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

  const { collector } = await startFlow({
    sources: {
      custom: {
        code: async (context) => ({
          type: 'custom',
          config: context.config,
          // Forward raw input into the collector. The collector's source
          // wrapper applies this source's config.mapping to every event.
          push: (event: WalkerOS.DeepPartialEvent) => context.env.push(event),
        }),
        config: {
          // Source-level mapping normalizes the raw event before the collector.
          mapping: {
            user: {
              login: {
                name: 'user authenticated', // Rename to a canonical name
                policy: {
                  // Reshape event data in place (source `data` maps are not
                  // forwarded; `policy` writes into the event that flows on).
                  'data.method': 'data.loginMethod',
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

  // Push through the source instance so source-level mapping applies.
  const customSource = Source.getSource(collector, 'custom');
  await customSource.push({
    name: 'user login',
    data: { id: 'user-456', loginMethod: 'google' },
  });

  return { destination, source };
}

export default testMapping;
