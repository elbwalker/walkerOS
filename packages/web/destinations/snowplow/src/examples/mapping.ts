import type { DestinationSnowplow } from '..';

export const structuredEvent: DestinationSnowplow.Rule = {
  data: {
    map: {
      category: { value: 'entity' },
      action: { value: 'action' },
      property: 'data.name',
      value: 'data.number',
    },
  },
};

export const pageView: DestinationSnowplow.Rule = {
  data: {
    map: {
      title: { value: 'Home' },
    },
  },
};

export const productView: DestinationSnowplow.Rule = {
  data: {
    map: {
      category: { value: 'product' },
      action: { value: 'view' },
      property: 'data.name',
      value: 'data.price',
    },
  },
};

export const purchase: DestinationSnowplow.Rule = {
  data: {
    map: {
      category: { value: 'order' },
      action: { value: 'complete' },
      property: 'data.id',
      value: 'data.total',
    },
  },
};

export const selfDescribingEvent: DestinationSnowplow.Rule = {
  data: {
    map: {
      event: {
        map: {
          schema: { value: 'iglu:com.example/product_view/jsonschema/1-0-0' },
          data: 'data',
        },
      },
    },
  },
};

export const config = {
  entity: { action: structuredEvent },
  page: { view: pageView },
  product: { view: productView },
  order: { complete: purchase },
} satisfies DestinationSnowplow.Rules;
