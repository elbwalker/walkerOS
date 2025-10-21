import { useState } from 'react';
import type { MappingState } from '../../hooks/useMappingState';

/**
 * Type option definition
 */
interface TypeOption {
  type:
    | 'map'
    | 'loop'
    | 'fn'
    | 'set'
    | 'key'
    | 'value'
    | 'consent'
    | 'condition'
    | 'validate';
  label: string;
  description: string;
  category: 'transformation' | 'advanced';
}

const TYPE_OPTIONS: TypeOption[] = [
  // Transformation types (mutually exclusive)
  {
    type: 'map',
    label: 'Map',
    description: 'Transform properties',
    category: 'transformation',
  },
  {
    type: 'loop',
    label: 'Loop',
    description: 'Iterate array',
    category: 'transformation',
  },
  {
    type: 'fn',
    label: 'Function',
    description: 'Custom logic',
    category: 'transformation',
  },
  {
    type: 'key',
    label: 'Key',
    description: 'Direct path',
    category: 'transformation',
  },
  {
    type: 'value',
    label: 'Value',
    description: 'Static value',
    category: 'transformation',
  },
  {
    type: 'set',
    label: 'Set',
    description: 'Set values',
    category: 'transformation',
  },

  // Advanced types (can be combined)
  {
    type: 'consent',
    label: 'Consent',
    description: 'Require consent',
    category: 'advanced',
  },
  {
    type: 'condition',
    label: 'Condition',
    description: 'If condition',
    category: 'advanced',
  },
  {
    type: 'validate',
    label: 'Validate',
    description: 'Rules check',
    category: 'advanced',
  },
];

/**
 * Type selection grid for mapping configuration
 */
export interface MappingTypeGridProps {
  path: string[];
  mappingState: MappingState;
  onSelectType: (type: string) => void;
  className?: string;
}

export function MappingTypeGrid({
  path,
  mappingState,
  onSelectType,
  className = '',
}: MappingTypeGridProps) {
  // Get current configuration at path
  const currentValue = mappingState.actions.getValue(path);

  // Handle string shorthand (e.g., "data.product" → { key: "data.product" })
  const isStringValue = typeof currentValue === 'string';
  const [pathValue, setPathValue] = useState<string>(
    isStringValue ? currentValue : '',
  );

  // Determine which types are currently configured
  const configuredTypes = new Set<string>();
  if (currentValue && typeof currentValue === 'object') {
    const obj = currentValue as Record<string, unknown>;
    Object.keys(obj).forEach((key) => {
      if (
        [
          'map',
          'loop',
          'fn',
          'set',
          'key',
          'value',
          'consent',
          'condition',
          'validate',
        ].includes(key)
      ) {
        configuredTypes.add(key);
      }
    });
  } else if (isStringValue) {
    // String is shorthand for key
    configuredTypes.add('key');
  }

  const handlePathChange = (newPath: string) => {
    setPathValue(newPath);
    // Save as string (shorthand)
    mappingState.actions.setValue(path, newPath);
  };

  const handlePathBlur = () => {
    if (pathValue.trim()) {
      mappingState.actions.setValue(path, pathValue.trim());
    }
  };

  return (
    <div className={`elb-mapping-type-grid ${className}`}>
      {/* Property Path - Simple/Default Case */}
      <div className="elb-mapping-property-path">
        <label className="elb-mapping-property-path-label">
          Property Path:
        </label>
        <input
          type="text"
          className="elb-mapping-property-path-input"
          value={pathValue}
          onChange={(e) => handlePathChange(e.target.value)}
          onBlur={handlePathBlur}
          placeholder="e.g., data.product or user.id"
        />
        <div className="elb-mapping-property-path-hint">
          Enter a simple path for direct property access
        </div>
      </div>

      {/* Advanced Configuration Grid */}
      <h3 className="elb-mapping-type-grid-title">
        Advanced Configuration (optional):
      </h3>

      <div className="elb-mapping-type-grid-container">
        {TYPE_OPTIONS.map((option) => {
          const isConfigured = configuredTypes.has(option.type);
          const isTransformation = option.category === 'transformation';

          return (
            <button
              key={option.type}
              type="button"
              className={`elb-mapping-type-tile ${isConfigured ? 'is-configured' : ''} ${isTransformation ? 'is-transformation' : 'is-advanced'}`}
              onClick={() => onSelectType(option.type)}
            >
              {isConfigured && (
                <span className="elb-mapping-type-tile-check">✓</span>
              )}
              <div className="elb-mapping-type-tile-label">{option.label}</div>
              <div className="elb-mapping-type-tile-description">
                {option.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
