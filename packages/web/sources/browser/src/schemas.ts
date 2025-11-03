import type { RJSFSchema } from '@rjsf/utils';

export const settingsSchema: RJSFSchema = {
  type: 'object',
  properties: {
    prefix: {
      type: 'string',
      default: 'data-elb',
      description: 'Prefix for data attributes',
    },
    scope: {
      type: 'string',
      description: 'DOM scope for event tracking (default: document)',
    },
    pageview: {
      type: 'boolean',
      default: true,
      description: 'Enable automatic pageview tracking',
    },
    session: {
      type: 'boolean',
      default: true,
      description: 'Enable session tracking',
    },
    elb: {
      type: 'string',
      default: 'elb',
      description: 'Name for global elb function',
    },
    name: {
      type: 'string',
      description: 'Custom name for source instance',
    },
    elbLayer: {
      type: 'string',
      default: 'elbLayer',
      description: 'Enable elbLayer for async command queuing',
    },
  },
};

export const taggerSchema: RJSFSchema = {
  type: 'object',
  properties: {
    prefix: {
      type: 'string',
      default: 'data-elb',
      description: 'Custom prefix for generated data attributes',
    },
  },
};

export const schemas = {
  settings: settingsSchema,
  tagger: taggerSchema,
};
