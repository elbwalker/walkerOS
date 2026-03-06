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
