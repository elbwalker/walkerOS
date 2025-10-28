import type { ConfigStructureDef } from './types';

/**
 * Structure Definition for Destination.Config
 *
 * Describes the shape of a full destination configuration:
 * - settings: Destination-specific settings
 * - mapping: Event mapping rules (entity → action hierarchy)
 * - data: Global data transformations
 * - policy: Processing policy rules
 * - consent: Consent requirements
 * - id, loadScript, queue, verbose: Config options
 *
 * This structure works with DestinationBox and ConfigEditor.
 */
export const DESTINATION_CONFIG_STRUCTURE: ConfigStructureDef = {
  type: 'object',
  title: 'Destination Configuration',
  description:
    'Complete destination configuration with settings, mapping, data, policy, and options',
  rootNodeType: 'entity', // Overview shows tiles

  properties: {
    // Config-level settings
    settings: {
      title: 'Settings',
      description: 'Destination-specific configuration',
      nodeType: 'settings', // Shows SettingsOverviewPane
      children: 'schema-driven', // Build from schemas.settings
      schemaPath: 'settings',
    },

    // Event mapping rules
    mapping: {
      title: 'Mapping',
      description: 'Event-specific mapping rules',
      nodeType: 'entity', // Shows entity list
      children: 'entity-action', // Special: mapping.{entity}.{action} pattern
    },

    // Global data transformations
    data: {
      title: 'Data',
      description: 'Global data transformations',
      children: 'value-driven', // Detect from value (map, loop, etc.)
      schemaPath: 'data',
    },

    // Processing policy
    policy: {
      title: 'Policy',
      description: 'Processing policy rules',
      nodeType: 'policy',
      children: 'none',
    },

    // Consent requirements
    consent: {
      title: 'Consent',
      description: 'Consent requirements',
      nodeType: 'consent',
      children: 'none',
    },

    // Config options
    id: {
      title: 'ID',
      description: 'Destination identifier',
      nodeType: 'primitive',
      children: 'none',
      schemaPath: 'id',
    },

    loadScript: {
      title: 'Load Script',
      description: 'Automatically load destination script',
      nodeType: 'boolean',
      children: 'none',
      schemaPath: 'loadScript',
    },

    queue: {
      title: 'Queue',
      description: 'Enable event queuing',
      nodeType: 'boolean',
      children: 'none',
      schemaPath: 'queue',
    },

    verbose: {
      title: 'Verbose',
      description: 'Enable verbose logging',
      nodeType: 'boolean',
      children: 'none',
      schemaPath: 'verbose',
    },
  },

  patterns: {
    'entity-action': true, // mapping property uses this pattern
  },
};
