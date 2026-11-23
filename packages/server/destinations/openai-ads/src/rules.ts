import type { Rule, Rules } from './types';

// The rules of the destination's own mapping, one per walkerOS standard event.
export const pageView: Rule = { name: 'page_viewed' };

export const productView: Rule = {
  name: 'contents_viewed',
  data: {
    map: {
      contents: {
        set: [
          {
            map: {
              id: 'data.id',
              name: 'data.name',
              amount: 'data.price',
              currency: 'data.currency',
            },
          },
        ],
      },
    },
  },
};

export const productAdd: Rule = {
  name: 'items_added',
  data: {
    map: {
      contents: {
        set: [
          {
            map: {
              id: 'data.id',
              name: 'data.name',
              quantity: 'data.quantity',
              amount: 'data.price',
              currency: 'data.currency',
            },
          },
        ],
      },
    },
  },
};

export const orderComplete: Rule = {
  name: 'order_created',
  data: {
    map: {
      amount: 'data.total',
      currency: 'data.currency',
      contents: {
        loop: [
          'nested',
          {
            condition: (entity: unknown) =>
              typeof entity === 'object' &&
              entity !== null &&
              'entity' in entity &&
              entity.entity === 'product',
            map: {
              id: 'data.id',
              name: 'data.name',
              quantity: 'data.quantity',
              amount: 'data.price',
            },
          },
        ],
      },
    },
  },
};

/**
 * The destination's own mapping: the walkerOS standard events as their
 * OpenAI types, every other event ignored. A `mapping` in the config replaces
 * it as a whole.
 */
export const rules: Rules = {
  page: { view: pageView },
  product: { view: productView, add: productAdd },
  order: { complete: orderComplete },
  '*': { '*': { ignore: true } },
};
