import type { RJSFSchema, UiSchema } from '@rjsf/utils';

const INCLUDE_OPTIONS = [
  'all',
  'context',
  'data',
  'event',
  'globals',
  'source',
  'user',
  'version',
] as const;

export const gtagMappingSchema: RJSFSchema = {
  type: 'object',
  title: 'Gtag Mapping Settings',
  properties: {
    ga4: {
      type: 'object',
      title: 'GA4',
      description: 'Configure GA4 specific options for this rule',
      properties: {
        include: {
          type: 'array',
          title: 'Include',
          description:
            'Select which walkerOS entities are passed to the GA4 payload',
          items: {
            type: 'string',
            enum: INCLUDE_OPTIONS as unknown as string[],
          },
          uniqueItems: true,
        },
      },
    },
    ads: {
      type: 'object',
      title: 'Google Ads',
      description: 'Configure Google Ads conversion settings',
      properties: {
        label: {
          type: 'string',
          title: 'Conversion Label',
          description:
            'Optional conversion label to link this rule to a Google Ads conversion action',
        },
      },
    },
    gtm: {
      type: 'object',
      title: 'Google Tag Manager',
      description: 'Optional GTM specific overrides',
      properties: {
        dataLayer: {
          type: 'string',
          title: 'Data Layer Variable',
          description:
            'Name of the data layer used when pushing events via GTM (defaults to dataLayer)',
        },
      },
    },
  },
};

export const gtagMappingUiSchema: UiSchema = {
  ga4: {
    include: {
      'ui:widget': 'checkboxes',
      'ui:options': {
        inline: false,
      },
      'ui:help':
        'Pick one or more entities that should be part of the GA4 payload',
    },
  },
  ads: {
    label: {
      'ui:placeholder': 'AW-123456789/purchase',
      'ui:help':
        'Copy the conversion label from your Google Ads conversion action',
    },
  },
  gtm: {
    dataLayer: {
      'ui:placeholder': 'dataLayer',
      'ui:help': 'Only override when using a custom GTM data layer name',
    },
  },
  'ui:order': ['ga4', 'ads', 'gtm'],
};

export const gtagMappingExample = {
  product: {
    view: {
      name: 'view_item',
      settings: {
        ga4: {
          include: ['data', 'context'],
        },
        gtm: {
          dataLayer: 'gtmDataLayer',
        },
      },
      data: {
        map: {
          currency: { key: 'data.currency', value: 'USD' },
          value: 'data.price',
          items: {
            loop: [
              'this',
              {
                map: {
                  item_id: 'data.id',
                  item_name: 'data.name',
                  item_category: 'data.category',
                  item_variant: 'data.variant',
                },
              },
            ],
          },
        },
      },
    },
    add: {
      name: 'add_to_cart',
      settings: {
        ga4: {
          include: ['data'],
        },
        ads: {
          label: 'ADD_TO_CART_CONVERSION',
        },
      },
      data: {
        map: {
          currency: { key: 'data.currency', value: 'USD' },
          value: 'data.price',
          items: {
            loop: [
              'this',
              {
                map: {
                  item_id: 'data.id',
                  item_name: 'data.name',
                  item_variant: 'data.variant',
                  quantity: { key: 'data.quantity', value: 1 },
                },
              },
            ],
          },
        },
      },
    },
  },
  cart: {
    view: {
      name: 'view_cart',
      settings: {
        ga4: {
          include: ['data'],
        },
        gtm: {},
      },
      data: {
        map: {
          cart_value: 'data.total',
          cart_currency: { key: 'data.currency', value: 'USD' },
          items: {
            loop: [
              'nested',
              {
                map: {
                  item_id: 'data.id',
                  item_name: 'data.name',
                  quantity: 'data.quantity',
                },
              },
            ],
          },
        },
      },
    },
  },
  order: {
    complete: {
      name: 'purchase',
      settings: {
        ga4: {
          include: ['data', 'context', 'user'],
        },
        ads: {
          label: 'PURCHASE_CONVERSION',
        },
        gtm: {},
      },
      data: {
        map: {
          transaction_id: 'data.id',
          value: 'data.total',
          tax: 'data.tax',
          shipping: 'data.shipping',
          currency: { key: 'data.currency', value: 'USD' },
          items: {
            loop: [
              'nested',
              {
                map: {
                  item_id: 'data.id',
                  item_name: 'data.name',
                  quantity: { key: 'data.quantity', value: 1 },
                  item_category: 'data.category',
                  price: 'data.price',
                },
              },
            ],
          },
        },
      },
    },
  },
};
