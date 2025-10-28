import type { ConfigStructureDef } from './types';

/**
 * Structure Definition for Mapping.Rule
 *
 * Describes the shape of a single mapping rule (e.g., mapping.page.view):
 * - name: Event name override
 * - batch: Batch size
 * - settings: Rule-level settings
 * - data: Data transformations
 * - consent: Consent requirements
 * - condition: Condition function
 * - ignore: Ignore flag
 *
 * This structure enables editing individual rules with ConfigEditor.
 */
export const MAPPING_RULE_STRUCTURE: ConfigStructureDef = {
  type: 'object',
  title: 'Mapping Rule',
  description: 'Configuration for a single event mapping rule',
  rootNodeType: 'rule', // Overview shows rule properties

  properties: {
    // Event name override
    name: {
      title: 'Event Name',
      description: 'Custom event name override',
      nodeType: 'name',
      children: 'none',
      schemaPath: 'rule.name', // Points to rule-properties-schema
    },

    // Batch configuration
    batch: {
      title: 'Batch Size',
      description: 'Number of events to batch together',
      nodeType: 'batch',
      children: 'none',
      schemaPath: 'rule.batch', // Points to rule-properties-schema
    },

    // Rule-level settings
    settings: {
      title: 'Settings',
      description: 'Rule-specific settings',
      children: 'schema-driven', // Build from schemas.mapping
      schemaPath: 'mapping', // Use schemas.mapping for rule settings
    },

    // Data transformations
    data: {
      title: 'Data',
      description: 'Data transformations for this event',
      children: 'value-driven', // Detect from value (map, loop, value, etc.)
    },

    // Consent requirements
    consent: {
      title: 'Consent',
      description: 'Required consent states',
      nodeType: 'consent',
      children: 'none',
    },

    // Condition function
    condition: {
      title: 'Condition',
      description: 'Function to determine if rule should apply',
      nodeType: 'condition',
      children: 'none',
    },

    // Ignore flag
    ignore: {
      title: 'Ignore',
      description: 'Skip processing this event',
      nodeType: 'boolean',
      children: 'none',
    },

    // Policy (less common, but supported)
    policy: {
      title: 'Policy',
      description: 'Event-level policy rules',
      nodeType: 'policy',
      children: 'none',
    },
  },
};
