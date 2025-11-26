import type { RJSFSchema } from '@rjsf/utils';

export const settings: RJSFSchema = {
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
    logger: {
      type: 'object',
      description: 'Logger configuration with level and custom handler',
      properties: {
        level: {
          type: 'string',
          enum: ['ERROR', 'INFO', 'DEBUG'],
          description: 'Minimum log level to display',
        },
      },
    },
  },
};

// Backward compatibility alias
export const settingsSchema = settings;
