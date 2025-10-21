/**
 * Value configuration type options
 */
export type ValueConfigType =
  | 'key'
  | 'value'
  | 'map'
  | 'loop'
  | 'function'
  | 'set';

/**
 * Single type selection button
 *
 * Used in the type selector grid/list to choose transformation type
 */
export interface MappingTypeButtonProps {
  type: ValueConfigType;
  label: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

export function MappingTypeButton({
  type,
  label,
  description,
  isActive,
  onClick,
  className = '',
}: MappingTypeButtonProps) {
  return (
    <button
      type="button"
      className={`elb-mapping-type-button ${isActive ? 'is-active' : ''} ${className}`}
      onClick={onClick}
      aria-pressed={isActive}
      data-type={type}
    >
      <div className="elb-mapping-type-button-content">
        <span className="elb-mapping-type-label">{label}</span>
        <span className="elb-mapping-type-description">{description}</span>
      </div>
    </button>
  );
}
