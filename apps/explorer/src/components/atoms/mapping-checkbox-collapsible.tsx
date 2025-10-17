import React from 'react';

export interface MappingCheckboxCollapsibleProps {
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * MappingCheckboxCollapsible - Checkbox-controlled collapsible section
 *
 * Simple collapsible component where a checkbox controls content visibility.
 * No chevron icon - the checkbox is the only control.
 *
 * Features:
 * - Checkbox controls visibility (checked = content visible)
 * - Two-line label: title + optional description
 * - Clicking label toggles checkbox
 * - No expand/collapse animation - immediate show/hide
 *
 * @example
 * <MappingCheckboxCollapsible
 *   title="Use condition"
 *   description="Conditionally apply this mapping rule"
 *   checked={hasCondition}
 *   onCheckedChange={setHasCondition}
 * >
 *   <CodeEditor code={code} onChange={setCode} />
 * </MappingCheckboxCollapsible>
 */
export function MappingCheckboxCollapsible({
  title,
  description,
  checked,
  onCheckedChange,
  children,
  disabled = false,
  className = '',
}: MappingCheckboxCollapsibleProps) {
  const handleHeaderClick = () => {
    if (!disabled) {
      onCheckedChange(!checked);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCheckedChange(e.target.checked);
  };

  return (
    <div className={`elb-checkbox-collapsible ${className}`.trim()}>
      <div
        className="elb-checkbox-collapsible-header"
        onClick={handleHeaderClick}
      >
        <input
          type="checkbox"
          className="elb-rjsf-checkbox elb-checkbox-collapsible-checkbox"
          checked={checked}
          onChange={handleCheckboxChange}
          disabled={disabled}
          onClick={(e) => e.stopPropagation()} // Prevent double-toggle
        />
        <div className="elb-checkbox-collapsible-label">
          <div className="elb-checkbox-collapsible-title">{title}</div>
          {description && (
            <div className="elb-checkbox-collapsible-description">
              {description}
            </div>
          )}
        </div>
      </div>
      {checked && (
        <div className="elb-checkbox-collapsible-content">{children}</div>
      )}
    </div>
  );
}
