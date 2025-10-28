import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import type { ConfigStructureDef } from '../../schemas/config-structures/types';
import type { NodeType } from '../../hooks/useMappingNavigation';
import type { RJSFSchema } from '@rjsf/utils';
import { BaseMappingPane } from '../atoms/base-mapping-pane';
import { RuleTile } from '../atoms/config-tile';

/**
 * Generic Config Overview Pane
 *
 * Shows all available properties from a structure definition as tiles.
 * Works at any depth with any config type (DestinationConfig, Rule, etc.).
 *
 * Features:
 * - Shows configured properties (with values)
 * - Shows available properties (not yet set)
 * - Uses structure definition for metadata (titles, descriptions)
 * - Generic - works with any ConfigStructureDef
 *
 * @example
 * // Full DestinationConfig
 * <ConfigOverviewPane
 *   config={destinationConfig}
 *   structure={DESTINATION_CONFIG_STRUCTURE}
 *   navigation={navigation}
 * />
 *
 * @example
 * // Single Rule
 * <ConfigOverviewPane
 *   config={ruleConfig}
 *   structure={MAPPING_RULE_STRUCTURE}
 *   navigation={navigation}
 * />
 */
export interface ConfigOverviewPaneProps<T extends Record<string, unknown>> {
  config: T;
  structure: ConfigStructureDef;
  navigation: UseMappingNavigationReturn;
  schemas?: Record<string, RJSFSchema>;
  className?: string;
}

interface PropertyInfo {
  key: string;
  title: string;
  description?: string;
  nodeType: NodeType;
  value?: unknown;
}

/**
 * Get status badge for a property value
 */
function getPropertyStatus(value: unknown): {
  enabled: boolean;
  text: string;
  variant?: 'success' | 'warning' | 'danger';
} {
  if (value === undefined || value === null) {
    return { enabled: false, text: 'Not set' };
  }

  if (typeof value === 'boolean') {
    return value
      ? { enabled: true, text: 'Enabled', variant: 'success' }
      : { enabled: false, text: 'Disabled' };
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return { enabled: true, text: String(value) };
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return { enabled: true, text: `${value.length} items` };
    }
    const keys = Object.keys(value);
    return { enabled: true, text: `${keys.length} properties` };
  }

  return { enabled: true, text: 'Set' };
}

export function ConfigOverviewPane<T extends Record<string, unknown>>({
  config,
  structure,
  navigation,
  schemas,
  className = '',
}: ConfigOverviewPaneProps<T>) {
  if (!structure.properties) {
    return (
      <BaseMappingPane
        title={structure.title || 'Configuration'}
        description={structure.description}
        navigation={navigation}
        className={className}
      >
        <div className="elb-mapping-rule-section">
          <p>No properties defined in structure.</p>
        </div>
      </BaseMappingPane>
    );
  }

  // Get all property keys from structure
  const propertyKeys = Object.keys(structure.properties);

  // Separate configured vs available
  const configuredProperties: PropertyInfo[] = [];
  const availableProperties: PropertyInfo[] = [];

  propertyKeys.forEach((key) => {
    const propertyDef = structure.properties![key];
    const value = config[key as keyof T];

    const propertyInfo: PropertyInfo = {
      key,
      title: propertyDef.title || capitalize(key),
      description: propertyDef.description,
      nodeType: propertyDef.nodeType || 'valueConfig',
      value,
    };

    if (value !== undefined) {
      configuredProperties.push(propertyInfo);
    } else {
      availableProperties.push(propertyInfo);
    }
  });

  const handlePropertyClick = (property: PropertyInfo) => {
    navigation.openTab([property.key], property.nodeType);
  };

  return (
    <BaseMappingPane
      title={structure.title || 'Configuration'}
      description={structure.description}
      navigation={navigation}
      className={className}
    >
      {/* Configured Properties */}
      {configuredProperties.length > 0 && (
        <div className="elb-mapping-rule-section">
          <h3 className="elb-mapping-rule-section-title">Configured</h3>
          <div className="elb-mapping-rule-section-grid">
            {configuredProperties.map((property) => (
              <RuleTile
                key={property.key}
                label={property.title}
                description={property.description}
                status={getPropertyStatus(property.value)}
                onClick={() => handlePropertyClick(property)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Properties */}
      {availableProperties.length > 0 && (
        <div className="elb-mapping-rule-section">
          <h3 className="elb-mapping-rule-section-title">Available</h3>
          <div className="elb-mapping-rule-section-grid">
            {availableProperties.map((property) => (
              <RuleTile
                key={property.key}
                label={property.title}
                description={property.description}
                status={{ enabled: false, text: 'Not set' }}
                onClick={() => handlePropertyClick(property)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {configuredProperties.length === 0 &&
        availableProperties.length === 0 && (
          <div className="elb-mapping-rule-section">
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
              <div style={{ fontSize: '16px', fontWeight: 500 }}>
                No properties available
              </div>
              <div style={{ fontSize: '14px', marginTop: '8px' }}>
                This configuration has no properties defined.
              </div>
            </div>
          </div>
        )}
    </BaseMappingPane>
  );
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
