import type { RJSFSchema, UiSchema } from '@rjsf/utils';

/**
 * RJSF schema for Plausible config-level settings
 * Matches Settings interface in types/index.ts
 *
 * @see {@link Settings} in types/index.ts
 */
export const settingsSchema: RJSFSchema = {
  type: 'object',
  title: 'Plausible Settings',
  properties: {
    domain: {
      type: 'string',
      title: 'Domain',
      description: 'Your website domain for Plausible tracking',
      format: 'hostname',
    },
  },
};

/**
 * UI Schema for Plausible settings
 */
export const settingsUiSchema: UiSchema = {
  domain: {
    'ui:placeholder': 'e.g., example.com',
    'ui:help': 'Domain as configured in your Plausible dashboard',
  },
};

/**
 * RJSF schema for Plausible rule-level mapping settings
 * Matches Mapping interface in types/index.ts
 *
 * Note: Plausible has an empty Mapping interface, so no rule-level settings
 *
 * @see {@link Mapping} in types/index.ts
 */
export const mappingSchema: RJSFSchema = {
  type: 'object',
  title: 'Plausible Mapping',
  properties: {},
  additionalProperties: false,
};

/**
 * UI Schema for Plausible mapping
 */
export const mappingUiSchema: UiSchema = {};
