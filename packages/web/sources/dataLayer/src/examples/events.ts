/**
 * Sample gtag events that would be pushed to dataLayer
 * These represent real-world gtag calls that the dataLayer source should transform to WalkerOS events
 */

/**
 * Consent Mode Events - Primary use case
 */
export function consentUpdate(): unknown[] {
  return [
    'consent',
    'update',
    {
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      ad_storage: 'denied',
      analytics_storage: 'granted',
    },
  ];
}

export function consentDefault(): unknown[] {
  return [
    'consent',
    'default',
    {
      ad_storage: 'denied',
      analytics_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    },
  ];
}

/**
 * E-commerce Events
 */
export function purchase(): unknown[] {
  return [
    'event',
    'purchase',
    {
      transaction_id: 'T_12345',
      value: 25.42,
      currency: 'EUR',
      items: [
        {
          item_id: 'SKU_12345',
          item_name: 'Product Name',
          item_category: 'Category',
          quantity: 1,
          price: 25.42,
        },
      ],
    },
  ];
}

export function add_to_cart(): unknown[] {
  return [
    'event',
    'add_to_cart',
    {
      currency: 'EUR',
      value: 15.25,
      items: [
        {
          item_id: 'SKU_12345',
          item_name: 'Product Name',
          item_variant: 'red',
          quantity: 1,
          price: 15.25,
        },
      ],
    },
  ];
}

export function view_item(): unknown[] {
  return [
    'event',
    'view_item',
    {
      currency: 'EUR',
      value: 15.25,
      items: [
        {
          item_id: 'SKU_12345',
          item_name: 'Product Name',
          item_category: 'Category',
          price: 15.25,
        },
      ],
    },
  ];
}

/**
 * Config Events
 */
export function config(): unknown[] {
  return [
    'config',
    'G-XXXXXXXXXX',
    {
      page_title: 'Custom Page Title',
      page_location: 'https://example.com/page',
      send_page_view: false,
    },
  ];
}

/**
 * Set Events
 */
export function setCustom(): unknown[] {
  return [
    'set',
    {
      currency: 'EUR',
      country: 'DE',
    },
  ];
}

/**
 * Direct dataLayer object pushes (not gtag)
 */
export function directDataLayerEvent(): Record<string, unknown> {
  return {
    event: 'custom_event',
    custom_parameter: 'custom_value',
    user_id: 'user123',
  };
}
