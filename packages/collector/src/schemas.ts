import type { RJSFSchema } from '@rjsf/utils';

export const settingsSchema: RJSFSchema = {
  type: 'object',
  properties: {
    run: {
      type: 'boolean',
      description:
        'Automatically start the collector pipeline on initialization',
    },
    sources: {
      type: 'object',
      description:
        'Configurations for sources providing events to the collector',
    },
    destinations: {
      type: 'object',
      description: 'Configurations for destinations receiving processed events',
    },
    consent: {
      type: 'object',
      description: 'Initial consent state to control routing of events',
    },
    verbose: {
      type: 'boolean',
      description: 'Enable verbose logging for debugging',
    },
    onError: {
      type: 'string',
      description:
        'Error handler triggered when the collector encounters failures',
    },
    onLog: {
      type: 'string',
      description: 'Custom log handler for collector messages',
    },
  },
};

export const schemas = {
  settings: settingsSchema,
};
