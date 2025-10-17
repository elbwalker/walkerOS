import React, { useState } from 'react';
import { IconButton } from './icon-button';

export interface CollapsibleSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  isExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  className?: string;
}

/**
 * CollapsibleSection - Generic expandable/collapsible section component
 *
 * Features:
 * - Toggle button with chevron icon (right when collapsed, down when expanded)
 * - 34px height header to match input field height
 * - Controlled or uncontrolled mode
 * - Theme-aware styling
 *
 * @example
 * // Uncontrolled mode
 * <CollapsibleSection title="Advanced Options" defaultExpanded={false}>
 *   <div>Content here</div>
 * </CollapsibleSection>
 *
 * @example
 * // Controlled mode
 * <CollapsibleSection
 *   title="Settings"
 *   isExpanded={isOpen}
 *   onToggle={setIsOpen}
 * >
 *   <div>Content here</div>
 * </CollapsibleSection>
 */
export function CollapsibleSection({
  title,
  description,
  children,
  defaultExpanded = false,
  isExpanded: controlledExpanded,
  onToggle,
  className = '',
}: CollapsibleSectionProps) {
  const [uncontrolledExpanded, setUncontrolledExpanded] =
    useState(defaultExpanded);

  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : uncontrolledExpanded;

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    if (!isControlled) {
      setUncontrolledExpanded(newExpanded);
    }
    onToggle?.(newExpanded);
  };

  return (
    <div className={`elb-collapsible ${className}`.trim()}>
      <button
        type="button"
        className="elb-collapsible-header"
        onClick={handleToggle}
      >
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
        <span className="elb-rjsf-label">{title}</span>
        {description && (
          <span className="elb-collapsible-description">{description}</span>
        )}
      </button>
      {isExpanded && <div className="elb-collapsible-content">{children}</div>}
    </div>
  );
}
