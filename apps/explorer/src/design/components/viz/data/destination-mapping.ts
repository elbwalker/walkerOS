/**
 * The destination mapping demo's script: three events, each through the real
 * mapping rules of four web destinations, and the vendor calls those produce.
 * A fidelity test runs every rule through the real destination and compares
 * the calls, so what the demo prints is what walkerOS sends. This file imports
 * nothing: the website's test loads it by path.
 */

/** A mapping value in the shape walkerOS reads (Mapping.Value). */
export type MappingValue = string | MappingValueConfig;

export interface MappingValueConfig {
  key?: string;
  value?: string | number | boolean;
  map?: { [key: string]: MappingValue };
  loop?: [MappingValue, MappingValue];
  set?: MappingValue[];
}

/** A destination's rule for one event (Mapping.Rule). */
export interface MappingRule {
  name?: string;
  data?: MappingValue;
  silent?: boolean;
  settings?: { revenue?: MappingValue };
}

/** One argument a vendor function received. */
export type CallArg = string | number | boolean | CallArg[] | CallObject;

export interface CallObject {
  [key: string]: CallArg;
}

/** One vendor call: the function's name, then its arguments. */
export type CallRecord = [string, ...CallArg[]];

export type DestinationId = 'ga4' | 'meta' | 'tiktok' | 'amplitude';

export interface MappingDestination {
  id: DestinationId;
  label: string;
  rule: MappingRule;
  calls: CallRecord[];
}

export interface MappingEntity {
  entity: string;
  data: { [key: string]: string | number };
}

export interface MappingDemoEvent {
  entity: string;
  action: string;
  data: { [key: string]: string | number };
  nested?: MappingEntity[];
  destinations: MappingDestination[];
}

/** Stands for a value walkerOS generates per event (its id); printed as '…'. */
export const GENERATED_ID = '…';

export const MAPPING_CAPTION =
  '50+ destination packages ship with the project. Removing GA4 or adding a new pixel is a block in this file, not a re-instrumentation project across every page.';

const GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX';

/** Each destination's settings, in its package's own shape. */
export const DESTINATION_SETTINGS: Readonly<Record<DestinationId, CallObject>> =
  {
    ga4: { ga4: { measurementId: GA4_MEASUREMENT_ID } },
    meta: { pixelId: '1234567890' },
    tiktok: { apiKey: 'C0D3T1KT0K' },
    amplitude: { apiKey: 'amplitude-api-key' },
  };

export const MAPPING_EVENTS: MappingDemoEvent[] = [
  {
    entity: 'product',
    action: 'view',
    data: { id: 'ers', price: 420, currency: 'EUR' },
    destinations: [
      {
        id: 'ga4',
        label: 'GA4',
        rule: {
          name: 'view_item',
          data: {
            map: {
              currency: 'data.currency',
              value: 'data.price',
              items: { loop: ['this', { map: { item_id: 'data.id' } }] },
            },
          },
        },
        calls: [
          [
            'gtag',
            'event',
            'view_item',
            {
              currency: 'EUR',
              value: 420,
              items: [{ item_id: 'ers' }],
              send_to: GA4_MEASUREMENT_ID,
            },
          ],
        ],
      },
      {
        id: 'meta',
        label: 'Meta Pixel',
        rule: {
          name: 'ViewContent',
          data: {
            map: {
              value: 'data.price',
              currency: 'data.currency',
              contents: {
                set: [
                  {
                    map: {
                      id: 'data.id',
                      quantity: { key: 'data.quantity', value: 1 },
                    },
                  },
                ],
              },
              content_type: { value: 'product' },
            },
          },
        },
        calls: [
          [
            'fbq',
            'track',
            'ViewContent',
            {
              value: 420,
              currency: 'EUR',
              contents: [{ id: 'ers', quantity: 1 }],
              content_type: 'product',
            },
            { eventID: GENERATED_ID },
          ],
        ],
      },
      {
        id: 'tiktok',
        label: 'TikTok Pixel',
        rule: {
          name: 'ViewContent',
          data: {
            map: {
              content_id: 'data.id',
              content_type: { value: 'product' },
              value: 'data.price',
              currency: 'data.currency',
            },
          },
        },
        calls: [
          [
            'ttq.track',
            'ViewContent',
            {
              content_id: 'ers',
              content_type: 'product',
              value: 420,
              currency: 'EUR',
            },
            { event_id: GENERATED_ID },
          ],
        ],
      },
      {
        id: 'amplitude',
        label: 'Amplitude',
        rule: {
          name: 'Product Viewed',
          data: {
            map: {
              product_id: 'data.id',
              price: 'data.price',
              currency: 'data.currency',
            },
          },
        },
        calls: [
          [
            'amplitude.track',
            'Product Viewed',
            { product_id: 'ers', price: 420, currency: 'EUR' },
          ],
        ],
      },
    ],
  },
  {
    entity: 'lead',
    action: 'submit',
    data: { type: 'demo', value: 2500, currency: 'EUR' },
    destinations: [
      {
        id: 'ga4',
        label: 'GA4',
        rule: {
          name: 'generate_lead',
          data: { map: { value: 'data.value', currency: 'data.currency' } },
        },
        calls: [
          [
            'gtag',
            'event',
            'generate_lead',
            { value: 2500, currency: 'EUR', send_to: GA4_MEASUREMENT_ID },
          ],
        ],
      },
      {
        id: 'meta',
        label: 'Meta Pixel',
        rule: {
          name: 'Lead',
          data: { map: { value: 'data.value', currency: 'data.currency' } },
        },
        calls: [
          [
            'fbq',
            'track',
            'Lead',
            { value: 2500, currency: 'EUR' },
            { eventID: GENERATED_ID },
          ],
        ],
      },
      {
        id: 'tiktok',
        label: 'TikTok Pixel',
        rule: {
          name: 'Contact',
          data: { map: { value: 'data.value', currency: 'data.currency' } },
        },
        calls: [
          [
            'ttq.track',
            'Contact',
            { value: 2500, currency: 'EUR' },
            { event_id: GENERATED_ID },
          ],
        ],
      },
      {
        id: 'amplitude',
        label: 'Amplitude',
        rule: {
          name: 'Lead Submitted',
          data: {
            map: {
              lead_type: 'data.type',
              value: 'data.value',
              currency: 'data.currency',
            },
          },
        },
        calls: [
          [
            'amplitude.track',
            'Lead Submitted',
            { lead_type: 'demo', value: 2500, currency: 'EUR' },
          ],
        ],
      },
    ],
  },
  {
    entity: 'order',
    action: 'complete',
    data: { id: '0rd3r1d', value: 462, currency: 'EUR' },
    nested: [
      { entity: 'product', data: { id: 'ers', price: 420, quantity: 1 } },
    ],
    destinations: [
      {
        id: 'ga4',
        label: 'GA4',
        rule: {
          name: 'purchase',
          data: {
            map: {
              transaction_id: 'data.id',
              value: 'data.value',
              currency: 'data.currency',
              items: {
                loop: [
                  'nested',
                  {
                    map: {
                      item_id: 'data.id',
                      price: 'data.price',
                      quantity: 'data.quantity',
                    },
                  },
                ],
              },
            },
          },
        },
        calls: [
          [
            'gtag',
            'event',
            'purchase',
            {
              transaction_id: '0rd3r1d',
              value: 462,
              currency: 'EUR',
              items: [{ item_id: 'ers', price: 420, quantity: 1 }],
              send_to: GA4_MEASUREMENT_ID,
            },
          ],
        ],
      },
      {
        id: 'meta',
        label: 'Meta Pixel',
        rule: {
          name: 'Purchase',
          data: {
            map: {
              value: 'data.value',
              currency: 'data.currency',
              contents: {
                loop: [
                  'nested',
                  { map: { id: 'data.id', quantity: 'data.quantity' } },
                ],
              },
              content_type: { value: 'product' },
            },
          },
        },
        calls: [
          [
            'fbq',
            'track',
            'Purchase',
            {
              value: 462,
              currency: 'EUR',
              contents: [{ id: 'ers', quantity: 1 }],
              content_type: 'product',
            },
            { eventID: GENERATED_ID },
          ],
        ],
      },
      {
        id: 'tiktok',
        label: 'TikTok Pixel',
        rule: {
          name: 'CompletePayment',
          data: {
            map: {
              order_id: 'data.id',
              value: 'data.value',
              currency: 'data.currency',
              contents: {
                loop: [
                  'nested',
                  {
                    map: {
                      content_id: 'data.id',
                      quantity: 'data.quantity',
                      price: 'data.price',
                    },
                  },
                ],
              },
              content_type: { value: 'product' },
            },
          },
        },
        calls: [
          [
            'ttq.track',
            'CompletePayment',
            {
              order_id: '0rd3r1d',
              value: 462,
              currency: 'EUR',
              contents: [{ content_id: 'ers', quantity: 1, price: 420 }],
              content_type: 'product',
            },
            { event_id: GENERATED_ID },
          ],
        ],
      },
      {
        id: 'amplitude',
        label: 'Amplitude',
        rule: {
          silent: true,
          settings: {
            revenue: {
              loop: [
                'nested',
                {
                  map: {
                    productId: 'data.id',
                    price: 'data.price',
                    quantity: 'data.quantity',
                    revenueType: { value: 'purchase' },
                    currency: { value: 'EUR' },
                  },
                },
              ],
            },
          },
        },
        calls: [
          [
            'amplitude.revenue',
            {
              productId: 'ers',
              price: 420,
              quantity: 1,
              revenueType: 'purchase',
              currency: 'EUR',
            },
          ],
        ],
      },
    ],
  },
];
