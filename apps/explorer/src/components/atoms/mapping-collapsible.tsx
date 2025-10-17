import React, { useState } from 'react';

export interface MappingCollapsibleProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  mode?: 'toggle' | 'checkbox';
  // For toggle mode
  defaultExpanded?: boolean;
  isExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  // For checkbox mode
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * MappingCollapsible - Unified collapsible component with two modes
 *
 * Modes:
 * - 'toggle' (default): Chevron icon that expands/collapses content
 * - 'checkbox': Checkbox that shows/hides content when checked
 *
 * Both modes support:
 * - Two-line label: title + optional description
 * - Controlled or uncontrolled state
 * - Theme-aware styling
 *
 * @example
 * // Toggle mode (consent widget)
 * <MappingCollapsible
 *   mode="toggle"
 *   title="Consent"
 *   description="Required consent states"
 *   isExpanded={isExpanded}
 *   onToggle={setIsExpanded}
 * >
 *   <ConsentRows />
 * </MappingCollapsible>
 *
 * @example
 * // Checkbox mode (condition widget)
 * <MappingCollapsible
 *   mode="checkbox"
 *   title="Condition"
 *   description="Conditionally apply this rule"
 *   checked={hasCondition}
 *   onCheckedChange={setHasCondition}
 * >
 *   <CodeEditor />
 * </MappingCollapsible>
 */
export function MappingCollapsible({
  title,
  description,
  children,
  mode = 'toggle',
  defaultExpanded = false,
  isExpanded: controlledExpanded,
  onToggle,
  checked = false,
  onCheckedChange,
  disabled = false,
  className = '',
}: MappingCollapsibleProps) {
  const [uncontrolledExpanded, setUncontrolledExpanded] =
    useState(defaultExpanded);

  // Toggle mode state
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : uncontrolledExpanded;
  const isOpen = mode === 'toggle' ? isExpanded : checked;

  const handleToggle = () => {
    if (mode === 'toggle') {
      const newExpanded = !isExpanded;
      if (!isControlled) {
        setUncontrolledExpanded(newExpanded);
      }
      onToggle?.(newExpanded);
    } else {
      // Checkbox mode
      if (!disabled) {
        onCheckedChange?.(!checked);
      }
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCheckedChange?.(e.target.checked);
  };

  // Determine which CSS classes to use
  const containerClass =
    mode === 'checkbox' ? 'elb-checkbox-collapsible' : 'elb-collapsible';
  const headerClass =
    mode === 'checkbox'
      ? 'elb-checkbox-collapsible-header'
      : 'elb-collapsible-header';
  const labelClass =
    mode === 'checkbox'
      ? 'elb-checkbox-collapsible-label'
      : 'elb-collapsible-label';
  const titleClass =
    mode === 'checkbox' ? 'elb-checkbox-collapsible-title' : 'elb-rjsf-label';
  const descriptionClass =
    mode === 'checkbox'
      ? 'elb-checkbox-collapsible-description'
      : 'elb-collapsible-description';
  const contentClass =
    mode === 'checkbox'
      ? 'elb-checkbox-collapsible-content'
      : 'elb-collapsible-content';

  if (mode === 'checkbox') {
    return (
      <div className={`${containerClass} ${className}`.trim()}>
        <div className={headerClass} onClick={handleToggle}>
          <input
            type="checkbox"
            className="elb-rjsf-checkbox elb-checkbox-collapsible-checkbox"
            checked={checked}
            onChange={handleCheckboxChange}
            disabled={disabled}
            onClick={(e) => e.stopPropagation()} // Prevent double-toggle
          />
          <div className={labelClass}>
            <div className={titleClass}>{title}</div>
            {description && (
              <div className={descriptionClass}>{description}</div>
            )}
          </div>
        </div>
        {checked && <div className={contentClass}>{children}</div>}
      </div>
    );
  }

  // Toggle mode
  return (
    <div className={`${containerClass} ${className}`.trim()}>
      <button type="button" className={headerClass} onClick={handleToggle}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          {isExpanded ? (
            <polyline points="6 9 12 15 18 9" />
          ) : (
            <polyline points="9 18 15 12 9 6" />
          )}
        </svg>
        <div className={labelClass}>
          <span className={titleClass}>{title}</span>
          {description && (
            <span className={descriptionClass}>{description}</span>
          )}
        </div>
      </button>
      {isExpanded && <div className={contentClass}>{children}</div>}
    </div>
  );
}

// Legacy exports for backward compatibility
export const CollapsibleSection = MappingCollapsible;
export const MappingCheckboxCollapsible = (
  props: Omit<MappingCollapsibleProps, 'mode'>,
) => <MappingCollapsible {...props} mode="checkbox" />;
