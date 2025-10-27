import type { RJSFSchema } from '@rjsf/utils';
import type { NodeType } from '../../hooks/useMappingNavigation';
import { RuleTile, type RuleTileStatus } from '../atoms/config-tile';
import { detectFromJsonSchema } from '../../utils/type-detector';

/**
 * Property Suggestions Component
 *
 * Shows configured properties first (as tiles with values), then available suggestions in a grid.
 * Uses schema to determine the correct NodeType for each property.
 */
export interface PropertySuggestionsProps {
  schema?: RJSFSchema;
  existingKeys?: string[];
  currentValue?: Record<string, unknown>;
  onSelect: (propertyName: string, nodeType: NodeType) => void;
  className?: string;
}

interface PropertyInfo {
  name: string;
  title: string;
  description?: string;
  nodeType: NodeType;
}

function getPropertyStatus(value: unknown, title: string): RuleTileStatus {
  if (value === undefined || value === null || value === '') {
    return { enabled: false, text: 'Not set' };
  }

  // Simple value display
  if (typeof value === 'string') {
    return { enabled: true, text: value };
  }
  if (typeof value === 'number') {
    return { enabled: true, text: String(value) };
  }
  if (typeof value === 'boolean') {
    return { enabled: true, text: value ? 'true' : 'false' };
  }
  if (Array.isArray(value)) {
    return { enabled: true, text: `${value.length} items` };
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    return { enabled: true, text: `${keys.length} properties` };
  }

  return { enabled: true, text: 'Configured' };
}

export function PropertySuggestions({
  schema,
  existingKeys = [],
  currentValue = {},
  onSelect,
  className = '',
}: PropertySuggestionsProps) {
  if (!schema || !schema.properties) {
    return null;
  }

  // Separate configured and available properties
  const configuredProperties: PropertyInfo[] = [];
  const availableProperties: PropertyInfo[] = [];

  Object.entries(schema.properties).forEach(([name, propSchema]) => {
    const propSchemaObj = propSchema as RJSFSchema;

    // Detect the correct NodeType from the property's schema
    const nodeType = detectFromJsonSchema(propSchemaObj);

    const propertyInfo: PropertyInfo = {
      name,
      title: propSchemaObj.title || name,
      description: propSchemaObj.description,
      nodeType,
    };

    if (existingKeys.includes(name)) {
      configuredProperties.push(propertyInfo);
    } else {
      availableProperties.push(propertyInfo);
    }
  });

  // Sort both lists alphabetically
  configuredProperties.sort((a, b) => a.title.localeCompare(b.title));
  availableProperties.sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className={`elb-property-suggestions ${className}`}>
      {/* Configured properties - shown as tiles with values */}
      {configuredProperties.length > 0 && (
        <div className="elb-property-suggestions-section">
          <div className="elb-property-suggestions-grid">
            {configuredProperties.map((prop) => (
              <RuleTile
                key={prop.name}
                label={prop.title}
                description={prop.description || ''}
                status={getPropertyStatus(currentValue[prop.name], prop.title)}
                onClick={() => onSelect(prop.name, prop.nodeType)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available properties - shown as simple tiles */}
      {availableProperties.length > 0 && (
        <div className="elb-property-suggestions-section">
          {configuredProperties.length > 0 && (
            <div className="elb-property-suggestions-divider">
              <span>Available Properties</span>
            </div>
          )}
          <div className="elb-property-suggestions-grid">
            {availableProperties.map((prop) => (
              <RuleTile
                key={prop.name}
                label={prop.title}
                description={prop.description || ''}
                status={{ enabled: false, text: 'Not set' }}
                onClick={() => onSelect(prop.name, prop.nodeType)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
