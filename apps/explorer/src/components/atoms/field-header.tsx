import React from 'react';

export interface FieldHeaderProps {
  title: string;
  description?: string;
  required?: boolean;
  action?: React.ReactNode;
}

/**
 * FieldHeader - Reusable header component for form fields
 *
 * Provides consistent label + description layout used throughout RJSF forms.
 * Optionally supports an action element (like a selector) positioned on the right.
 *
 * Features:
 * - Standard label with optional required indicator
 * - Optional description with consistent styling
 * - Optional action element aligned to the right
 * - Uses same structure as FieldTemplate for consistency
 *
 * @example
 * // Simple label + description
 * <FieldHeader
 *   title="Name"
 *   description="Enter your full name"
 * />
 *
 * @example
 * // With action element (type selector)
 * <FieldHeader
 *   title="Value"
 *   description="Static value to return"
 *   action={
 *     <select value={type} onChange={handleChange}>
 *       <option value="string">String</option>
 *       <option value="number">Number</option>
 *     </select>
 *   }
 * />
 */
export function FieldHeader({
  title,
  description,
  required,
  action,
}: FieldHeaderProps) {
  // If there's an action, use flexbox layout; otherwise use standard block layout
  if (action) {
    return (
      <div className="elb-field-header-with-action">
        <div>
          <label className="elb-rjsf-label">
            {title}
            {required && <span className="elb-rjsf-required"> *</span>}
          </label>
          {description && (
            <div className="elb-rjsf-description">{description}</div>
          )}
        </div>
        {action}
      </div>
    );
  }

  // Standard layout without action
  return (
    <>
      <label className="elb-rjsf-label">
        {title}
        {required && <span className="elb-rjsf-required"> *</span>}
      </label>
      {description && <div className="elb-rjsf-description">{description}</div>}
    </>
  );
}
