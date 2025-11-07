import type { RJSFSchema } from '@rjsf/utils';

export const settings: RJSFSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      default: 'dataLayer',
      description: 'DataLayer variable name',
    },
    prefix: {
      type: 'string',
      default: 'dataLayer',
      description: 'Event prefix for filtering',
    },
    filter: {
      type: 'string',
      description: 'Custom function to filter which events to process',
    },
  },
};
