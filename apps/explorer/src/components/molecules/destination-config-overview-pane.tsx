import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import type { RJSFSchema } from '@rjsf/utils';
import { RuleTile, type RuleTileStatus } from '../atoms/config-tile';
import { BaseMappingPane } from '../atoms/base-mapping-pane';
import { detectFromJsonSchema } from '../../utils/type-detector';
import type { NodeType } from '../../hooks/useMappingNavigation';
import {
  destinationConfigStructureSchema,
  getRootPropertyNodeType,
} from '../../schemas/destination-config-structure';
import type { DestinationSchemas } from '../organisms/destination-box';

/**
 * Destination Config Overview Pane - Shows root-level config properties as tiles
 *
 * Displays the top-level structure of a DestinationConfig, showing both
 * configured and available properties based on the destinationConfigStructureSchema.
 *
 * Features:
 * - Displays configured properties with status/value preview
 * - Shows available properties from schema (if not yet configured)
 * - Click tile to navigate to detailed editor
 * - Schema-driven type detection for correct editor pane
 *
 * Similar to SettingsOverviewPane but for root-level config structure
 * (settings, mapping, data, policy, consent, id, loadScript, queue, verbose)
 *
 * @example
 * <DestinationConfigOverviewPane
 *   mappingState={configState}
 *   navigation={navigation}
 *   schemas={metaPixelSchemas}
 * />
 */
export interface DestinationConfigOverviewPaneProps {
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  schemas?: DestinationSchemas;
  className?: string;
}

function getPropertyStatus(key: string, value: unknown): RuleTileStatus {
  // Property not configured
  if (value === undefined || value === null) {
    return { enabled: false, text: 'Not set' };
  }

  switch (key) {
    case 'settings': {
      if (typeof value !== 'object' || Array.isArray(value)) {
        return { enabled: false, text: 'Not set' };
      }
      const count = Object.keys(value as Record<string, unknown>).length;
      return count > 0
        ? {
            enabled: true,
            text: `${count} ${count === 1 ? 'setting' : 'settings'}`,
          }
        : { enabled: false, text: 'Not set' };
    }

    case 'mapping': {
      if (typeof value !== 'object' || Array.isArray(value)) {
        return { enabled: false, text: 'Not set' };
      }
      // Count entity-action pairs
      const mappingObj = value as Record<string, unknown>;
      let ruleCount = 0;
      Object.values(mappingObj).forEach((entityConfig) => {
        if (typeof entityConfig === 'object' && entityConfig !== null) {
          ruleCount += Object.keys(
            entityConfig as Record<string, unknown>,
          ).length;
        }
      });
      return ruleCount > 0
        ? {
            enabled: true,
            text: `${ruleCount} ${ruleCount === 1 ? 'rule' : 'rules'}`,
          }
        : { enabled: false, text: 'Not set' };
    }

    case 'policy': {
      if (typeof value !== 'object' || Array.isArray(value)) {
        return { enabled: false, text: 'Not set' };
      }
      const count = Object.keys(value as Record<string, unknown>).length;
      return count > 0
        ? {
            enabled: true,
            text: `${count} ${count === 1 ? 'condition' : 'conditions'}`,
          }
        : { enabled: false, text: 'Not set' };
    }

    case 'consent': {
      if (typeof value !== 'object' || Array.isArray(value)) {
        return { enabled: false, text: 'Not set' };
      }
      const count = Object.keys(value as Record<string, unknown>).length;
      return count > 0
        ? {
            enabled: true,
            text: `${count} ${count === 1 ? 'state' : 'states'}`,
          }
        : { enabled: false, text: 'Not set' };
    }

    case 'data': {
      return { enabled: true, text: 'Configured' };
    }

    case 'id': {
      if (typeof value === 'string' && value.trim()) {
        return { enabled: true, text: value };
      }
      return { enabled: false, text: 'Not set' };
    }

    case 'loadScript':
    case 'queue':
    case 'verbose': {
      if (typeof value === 'boolean') {
        return { enabled: true, text: value ? 'Enabled' : 'Disabled' };
      }
      return { enabled: false, text: 'Not set' };
    }

    default: {
      // Generic handling for unknown properties
      if (typeof value === 'string') {
        return { enabled: true, text: value };
      }
      if (typeof value === 'number') {
        return { enabled: true, text: String(value) };
      }
      if (typeof value === 'boolean') {
        return { enabled: true, text: value ? 'Enabled' : 'Disabled' };
      }
      if (Array.isArray(value)) {
        return { enabled: true, text: `${value.length} items` };
      }
      if (typeof value === 'object') {
        const keys = Object.keys(value as Record<string, unknown>);
        return { enabled: true, text: `${keys.length} properties` };
      }
      return { enabled: true, text: 'Configured' };
    }
  }
}

export function DestinationConfigOverviewPane({
  mappingState,
  navigation,
  schemas,
  className = '',
}: DestinationConfigOverviewPaneProps) {
  const config = mappingState.config;

  // Gather all property keys (from value + schema)
  const configuredKeys = Object.keys(config).filter(
    (key) => config[key] !== undefined,
  );
  const schemaKeys = destinationConfigStructureSchema.properties
    ? Object.keys(destinationConfigStructureSchema.properties)
    : [];
  const allKeys = Array.from(
    new Set([...configuredKeys, ...schemaKeys]),
  ).sort();

  // Separate configured vs available
  const configuredProperties: Array<{
    key: string;
    title: string;
    description?: string;
    nodeType: NodeType;
    value: unknown;
  }> = [];

  const availableProperties: Array<{
    key: string;
    title: string;
    description?: string;
    nodeType: NodeType;
  }> = [];

  allKeys.forEach((key) => {
    const propSchema = destinationConfigStructureSchema.properties?.[key] as
      | RJSFSchema
      | undefined;
    const title =
      propSchema?.title || key.charAt(0).toUpperCase() + key.slice(1);
    const description = propSchema?.description;

    // Determine NodeType using schema-driven approach
    const definedType = getRootPropertyNodeType(key);
    const nodeType = definedType
      ? (definedType as NodeType)
      : propSchema
        ? detectFromJsonSchema(propSchema)
        : 'valueConfig';

    if (key in config && config[key] !== undefined) {
      configuredProperties.push({
        key,
        title,
        description,
        nodeType,
        value: config[key],
      });
    } else {
      availableProperties.push({
        key,
        title,
        description,
        nodeType,
      });
    }
  });

  const handlePropertyClick = (key: string, nodeType: NodeType) => {
    navigation.openTab([key], nodeType);
  };

  return (
    <BaseMappingPane
      title="Destination Configuration"
      description={
        configuredProperties.length === 0
          ? 'No configuration yet. Click a tile to start configuring.'
          : `${configuredProperties.length} ${configuredProperties.length === 1 ? 'property' : 'properties'} configured`
      }
      navigation={navigation}
      hideNavigation={true}
      className={className}
    >
      <div className="elb-mapping-rule-section-grid">
        {/* Configured properties */}
        {configuredProperties.map((property) => (
          <RuleTile
            key={property.key}
            label={property.title}
            description={property.description || ''}
            status={getPropertyStatus(property.key, property.value)}
            onClick={() => handlePropertyClick(property.key, property.nodeType)}
          />
        ))}
      </div>

      {/* Available properties (from schema) */}
      {availableProperties.length > 0 && (
        <div className="elb-mapping-rule-section">
          <h3 className="elb-mapping-rule-section-title">
            Available Configuration Options
          </h3>
          <p className="elb-mapping-rule-section-description">
            Click to configure additional destination options
          </p>
          <div className="elb-mapping-rule-section-grid">
            {availableProperties.map((property) => (
              <RuleTile
                key={property.key}
                label={property.title}
                description={property.description || ''}
                status={{ enabled: false, text: 'Not set' }}
                onClick={() =>
                  handlePropertyClick(property.key, property.nodeType)
                }
              />
            ))}
          </div>
        </div>
      )}
    </BaseMappingPane>
  );
}
