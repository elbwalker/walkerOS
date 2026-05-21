import type { Meta, StoryObj } from '@storybook/react-vite';
import type { RJSFSchema } from '@rjsf/utils';
import { PropertyTable } from './property-table';

/**
 * PropertyTable - Schema-based property documentation table
 *
 * Generates a documentation table from a JSON Schema showing properties,
 * types, descriptions, defaults, and required fields. Click on a row to
 * see full property details in a modal.
 */
const meta: Meta<typeof PropertyTable> = {
  component: PropertyTable,
  title: 'Molecules/PropertyTable',
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PropertyTable>;

const exampleSchema: RJSFSchema = {
  type: 'object',
  required: ['apiKey', 'region'],
  properties: {
    apiKey: {
      type: 'string',
      description: 'Your API authentication key for the service',
    },
    region: {
      type: 'string',
      enum: ['us-east-1', 'eu-west-1', 'ap-south-1'],
      description: 'Geographic region for data processing',
      default: 'us-east-1',
    },
    timeout: {
      type: 'number',
      description: 'Request timeout in milliseconds (like 5000)',
      default: '3000',
    },
    retryAttempts: {
      type: 'number',
      description: 'Number of retry attempts on failure',
      default: '3',
    },
    enableDebug: {
      type: 'boolean',
      description: 'Enable verbose debug logging',
      default: 'false',
    },
    tags: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: 'Custom tags for categorization (like analytics, marketing)',
    },
    metadata: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
      description: 'Additional key-value metadata',
    },
    endpoints: {
      type: 'array',
      items: {
        enum: ['tracking', 'analytics', 'conversion'],
      },
      description: 'Enabled API endpoints',
    },
    mode: {
      anyOf: [{ type: 'string' }, { type: 'number' }],
      description: 'Operation mode - can be string identifier or numeric code',
    },
  },
};

/**
 * Default property table with various data types
 *
 * Demonstrates different schema types:
 * - Required fields (marked with *)
 * - Enum types
 * - Arrays with typed items
 * - Objects with additionalProperties
 * - Union types (anyOf)
 */
export const Default: Story = {
  args: {
    schema: exampleSchema,
  },
};

/**
 * Nested object settings, modeled on the gtag destination
 *
 * The gtag `settings` schema groups configuration into specialized nested
 * objects (`ga4`, `ads`, `gtm`), each with their own properties and required
 * fields. Readers need to see the shape of each group, not just that it is an
 * "object".
 */
const nestedSettingsSchema: RJSFSchema = {
  type: 'object',
  properties: {
    ga4: {
      type: 'object',
      title: 'ga4',
      description: 'GA4-specific configuration settings',
      required: ['measurementId'],
      additionalProperties: false,
      properties: {
        measurementId: {
          type: 'string',
          pattern: '^G-[A-Z0-9]+$',
          description: 'GA4 measurement ID (like G-XXXXXXXXXX)',
        },
        debug: {
          type: 'boolean',
          description: 'Enable GA4 debug mode',
          default: 'false',
        },
        pageview: {
          type: 'boolean',
          description: 'Send pageview events automatically',
          default: 'true',
        },
        server_container_url: {
          type: 'string',
          description: 'Server-side GTM container URL for first-party tracking',
        },
        snakeCase: {
          type: 'boolean',
          description: 'Convert event and property keys to snake_case',
        },
      },
    },
    ads: {
      type: 'object',
      title: 'ads',
      description: 'Google Ads specific configuration settings',
      required: ['conversionId'],
      additionalProperties: false,
      properties: {
        conversionId: {
          type: 'string',
          pattern: '^AW-[0-9]+$',
          description: 'Google Ads conversion ID (like AW-XXXXXXXXX)',
        },
        currency: {
          type: 'string',
          minLength: 3,
          maxLength: 3,
          description: 'Default currency code (like EUR)',
          default: 'EUR',
        },
      },
    },
    gtm: {
      type: 'object',
      title: 'gtm',
      description: 'Google Tag Manager specific configuration settings',
      required: ['containerId'],
      additionalProperties: false,
      properties: {
        containerId: {
          type: 'string',
          pattern: '^GTM-[A-Z0-9]+$',
          description: 'GTM container ID (like GTM-XXXXXXX)',
        },
        dataLayer: {
          type: 'string',
          description: 'Custom dataLayer variable name',
          default: 'dataLayer',
        },
        domain: {
          type: 'string',
          description: 'Custom GTM domain for first-party serving',
        },
      },
    },
  },
};

/**
 * Nested object settings (ga4, ads, gtm), modeled on the gtag destination.
 *
 * Each top-level key is an object with its own properties and required fields.
 * The table should expand these nested objects so readers can see every field,
 * not just the "object" type label.
 */
export const NestedObjects: Story = {
  args: {
    schema: nestedSettingsSchema,
  },
};
