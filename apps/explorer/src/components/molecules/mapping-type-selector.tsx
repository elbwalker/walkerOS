import { MappingTypeButton } from '../atoms/mapping-type-button';
import type { ValueConfigType } from '../atoms/mapping-type-button';

/**
 * Type option definition
 */
interface TypeOption {
  type: ValueConfigType;
  label: string;
  description: string;
}

/**
 * Available transformation types
 */
const TYPE_OPTIONS: TypeOption[] = [
  {
    type: 'key',
    label: 'Key Path',
    description: 'Extract value from event path',
  },
  { type: 'value', label: 'Static Value', description: 'Return fixed value' },
  {
    type: 'loop',
    label: 'Loop',
    description: 'Process array with transformation',
  },
  { type: 'map', label: 'Map', description: 'Transform object properties' },
  {
    type: 'function',
    label: 'Function',
    description: 'Custom transformation logic',
  },
  { type: 'set', label: 'Set', description: 'Array of static values' },
];

/**
 * Layout mode for type selector
 */
export type TypeSelectorLayout = 'radio' | 'grid' | 'responsive';

/**
 * Adaptive type selection UI
 *
 * Shows transformation types as:
 * - Radio buttons (narrow screens or 'radio' mode)
 * - Button grid (wide screens or 'grid' mode)
 * - Responsive (adapts based on container width)
 */
export interface MappingTypeSelectorProps {
  currentType: ValueConfigType | null;
  onChange: (type: ValueConfigType) => void;
  layout?: TypeSelectorLayout;
  className?: string;
}

export function MappingTypeSelector({
  currentType,
  onChange,
  layout = 'responsive',
  className = '',
}: MappingTypeSelectorProps) {
  // Radio layout - vertical list with radio buttons
  if (layout === 'radio') {
    return (
      <fieldset
        className={`elb-mapping-type-selector elb-mapping-type-selector--radio ${className}`}
      >
        <legend className="elb-mapping-type-selector-legend">
          Transformation Type:
        </legend>
        <div className="elb-mapping-type-selector-radio-list">
          {TYPE_OPTIONS.map((option) => (
            <label
              key={option.type}
              className={`elb-mapping-type-radio-label ${currentType === option.type ? 'is-selected' : ''}`}
            >
              <input
                type="radio"
                name="mapping-type"
                value={option.type}
                checked={currentType === option.type}
                onChange={() => onChange(option.type)}
                className="elb-mapping-type-radio-input"
              />
              <span className="elb-mapping-type-radio-content">
                <span className="elb-mapping-type-radio-label">
                  {option.label}
                </span>
                <span className="elb-mapping-type-radio-description">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  // Grid layout - button grid
  if (layout === 'grid') {
    return (
      <div
        className={`elb-mapping-type-selector elb-mapping-type-selector--grid ${className}`}
        role="radiogroup"
        aria-label="Transformation Type"
      >
        <div className="elb-mapping-type-selector-legend">
          Transformation Type:
        </div>
        <div className="elb-mapping-type-selector-grid">
          {TYPE_OPTIONS.map((option) => (
            <MappingTypeButton
              key={option.type}
              type={option.type}
              label={option.label}
              description={option.description}
              isActive={currentType === option.type}
              onClick={() => onChange(option.type)}
            />
          ))}
        </div>
      </div>
    );
  }

  // Responsive layout - adapts based on CSS media queries
  return (
    <div
      className={`elb-mapping-type-selector elb-mapping-type-selector--responsive ${className}`}
      role="radiogroup"
      aria-label="Transformation Type"
    >
      <div className="elb-mapping-type-selector-legend">
        Transformation Type:
      </div>

      {/* Radio list (shown on narrow screens) */}
      <div className="elb-mapping-type-selector-radio-list">
        {TYPE_OPTIONS.map((option) => (
          <label
            key={option.type}
            className={`elb-mapping-type-radio-label ${currentType === option.type ? 'is-selected' : ''}`}
          >
            <input
              type="radio"
              name="mapping-type"
              value={option.type}
              checked={currentType === option.type}
              onChange={() => onChange(option.type)}
              className="elb-mapping-type-radio-input"
            />
            <span className="elb-mapping-type-radio-content">
              <span className="elb-mapping-type-radio-label">
                {option.label}
              </span>
              <span className="elb-mapping-type-radio-description">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </div>

      {/* Button grid (shown on wide screens) */}
      <div className="elb-mapping-type-selector-grid">
        {TYPE_OPTIONS.map((option) => (
          <MappingTypeButton
            key={option.type}
            type={option.type}
            label={option.label}
            description={option.description}
            isActive={currentType === option.type}
            onClick={() => onChange(option.type)}
          />
        ))}
      </div>
    </div>
  );
}
