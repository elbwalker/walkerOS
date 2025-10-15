/**
 * Manual Mapping Test
 *
 * Run this with: node --loader ts-node/esm src/mapping-test.ts
 * Or: npm run test -- mapping-test
 */

import { startFlow } from '@walkeros/collector';
import type { WalkerOS } from '@walkeros/core';

async function testMapping() {
  console.log('\n🧪 Testing walkerOS Mapping System\n');
  console.log('='.repeat(60));

  // Create a simple console destination to see results
  const { elb, collector } = await startFlow({
    destinations: {
      console: {
        code: async (config, env) => ({
          type: 'console',
          config,
          push: async (event, context) => {
            console.log('\n📦 Destination received event:');
            console.log('  Name:', event.name);
            console.log('  Data:', JSON.stringify(event.data, null, 2));
            console.log('  Mapping applied:', context.mapping?.name || 'none');
          },
        }),
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
                    currency: { value: 'USD' }, // Static value
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
                    currency: { value: 'USD' },
                    // Custom function
                    tax: {
                      fn: (event: WalkerOS.Event) => {
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

  // Test 1: Basic event without mapping
  console.log('\n\n1️⃣  Test: Event without mapping');
  console.log('-'.repeat(60));
  await elb('page view', { title: 'Home Page' });

  // Test 2: Product view with mapping
  console.log('\n\n2️⃣  Test: Product view (mapped to view_item)');
  console.log('-'.repeat(60));
  await elb('product view', {
    id: 'P123',
    name: 'Premium Laptop',
    price: 999.99,
  });

  // Test 3: Product add with mapping
  console.log('\n\n3️⃣  Test: Product add (mapped to add_to_cart)');
  console.log('-'.repeat(60));
  await elb('product add', {
    id: 'P123',
    quantity: 2,
  });

  // Test 4: Order complete with custom function
  console.log('\n\n4️⃣  Test: Order complete (with calculated tax)');
  console.log('-'.repeat(60));
  await elb('order complete', {
    id: 'ORDER-789',
    total: 1000,
  });

  // Test 5: Source-level mapping
  console.log('\n\n5️⃣  Test: Source-level mapping');
  console.log('-'.repeat(60));

  const { elb: sourceElb } = await startFlow({
    sources: {
      custom: {
        code: async (config, env) => ({
          type: 'custom',
          config,
          push: env.elb,
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
        code: async (config, env) => ({
          type: 'console',
          config,
          push: async (event) => {
            console.log('\n📦 Event with source mapping:');
            console.log('  Name:', event.name);
            console.log('  Data:', JSON.stringify(event.data, null, 2));
          },
        }),
        config: {},
      },
    },
  });

  await sourceElb('user login', {
    id: 'user-456',
    loginMethod: 'google',
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ All mapping tests completed!\n');
}

// Run tests
testMapping().catch(console.error);
