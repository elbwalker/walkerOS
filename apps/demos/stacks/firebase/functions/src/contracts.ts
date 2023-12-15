import { Schema } from '@elbwalker/types';

export const analystContract: Schema.Contract = {
  product: {
    '*': {
      data: {
        schema: {
          // Uncomment this to enable validation
          // name: { required: true },
        },
      },
    },
  },
};

export const scientistContract: Schema.Contract = {
  '*': {
    '*': {
      globals: {
        schema: {
          // Uncomment this to enable validation
          // cart_value: { type: 'number' },
        },
      },
    },
  },
};
