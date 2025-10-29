import { getEvent } from '@walkeros/core';

/**
 * Example Snowplow function call outputs
 *
 * These represent the actual arguments passed to window.snowplow()
 * when different events are tracked.
 */

export function structuredEvent(): unknown[] {
  const event = getEvent();

  return ['trackStructEvent', 'entity', 'action', undefined, undefined, 1];
}

export function pageView(): unknown[] {
  return ['trackPageView'];
}

export function productView(): unknown[] {
  const event = getEvent();

  return [
    'trackStructEvent',
    'product',
    'view',
    undefined,
    'Everyday Ruck Snack', // From getEvent() mock data
    420,
  ];
}

export function purchase(): unknown[] {
  const event = getEvent();

  return [
    'trackStructEvent',
    'order',
    'complete',
    undefined,
    '0rd3r1d', // From getEvent() mock data
    555,
  ];
}

export function selfDescribingEvent(): unknown[] {
  const event = getEvent();

  return [
    'trackSelfDescribingEvent',
    {
      event: {
        schema: 'iglu:com.example/product_view/jsonschema/1-0-0',
        data: {
          id: 'ers',
          name: 'Everyday Ruck Snack',
          price: 420,
          color: 'black',
          size: 'l',
        },
      },
    },
  ];
}
