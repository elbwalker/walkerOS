import type { RJSFSchema } from '@rjsf/utils';

export const settings: RJSFSchema = {
  type: 'object',
  properties: {
    elb: {
      type: 'string',
      default: 'elb',
      description: 'Global function name for event tracking',
    },
    name: {
      type: 'string',
      default: 'walkerjs',
      description: 'Global instance name',
    },
    run: {
      type: 'boolean',
      default: true,
      description: 'Auto-initialize walker.js on load',
    },
    browser: {
      type: 'object',
      default: {
        run: true,
        session: true,
        scope: 'document.body',
        pageview: true,
      },
      description:
        'Browser source configuration. Set to false to disable. See browser configuration section below for details.',
    },
    dataLayer: {
      type: 'object',
      default: false,
      description:
        'DataLayer source configuration. Set to true for defaults or object for custom config. See dataLayer configuration section below.',
    },
    collector: {
      type: 'object',
      default: {},
      description:
        'Collector configuration including destinations and consent settings. See collector configuration section below.',
    },
  },
};

export const browserConfig: RJSFSchema = {
  type: 'object',
  properties: {
    'browser.run': {
      type: 'boolean',
      default: true,
      description: 'Auto-start DOM tracking',
    },
    'browser.session': {
      type: 'boolean',
      default: true,
      description: 'Enable session tracking',
    },
    'browser.scope': {
      type: 'string',
      default: 'document.body',
      description: 'DOM element scope for tracking',
    },
    'browser.pageview': {
      type: 'boolean',
      default: true,
      description: 'Enable automatic page view events',
    },
  },
};

export const dataLayerConfig: RJSFSchema = {
  type: 'object',
  properties: {
    dataLayer: {
      type: 'boolean',
      default: false,
      description: 'Enable dataLayer integration with defaults',
    },
    'dataLayer.name': {
      type: 'string',
      default: 'dataLayer',
      description: 'DataLayer variable name',
    },
    'dataLayer.prefix': {
      type: 'string',
      default: 'dataLayer',
      description: 'Event prefix for dataLayer events',
    },
  },
};

export const collectorConfig: RJSFSchema = {
  type: 'object',
  properties: {
    'collector.consent': {
      type: 'object',
      default: { functional: true },
      description: 'Default consent state',
    },
    'collector.destinations': {
      type: 'object',
      default: {},
      description:
        'Destination configurations. See destinations documentation for available options.',
    },
  },
};
