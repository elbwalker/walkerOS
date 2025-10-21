import React from 'react';

/**
 * Hint item definition
 */
export interface HintItem {
  code: string;
  description: string;
}

/**
 * PanelHints - Reusable hints component for panel views
 *
 * Displays a clean, modern hints box with code examples and descriptions.
 * Used across all property panel views for consistency.
 *
 * Features:
 * - Minimal design with subtle background
 * - Code-first presentation
 * - Clean typography
 * - Theme-aware styling
 *
 * @example
 * <PanelHints
 *   title="Common patterns"
 *   hints={[
 *     { code: 'data.id', description: 'Product identifier' },
 *     { code: 'user.email', description: 'User email address' }
 *   ]}
 * />
 */
export interface PanelHintsProps {
  title?: string;
  hints: HintItem[];
  className?: string;
}

export function PanelHints({
  title = 'Common patterns',
  hints,
  className = '',
}: PanelHintsProps) {
  return (
    <div className={`elb-panel-hints ${className}`}>
      {title && <div className="elb-panel-hints-title">{title}</div>}
      <ul className="elb-panel-hints-list">
        {hints.map((hint, index) => (
          <li key={index} className="elb-panel-hints-item">
            <code className="elb-panel-hints-code">{hint.code}</code>
            <span className="elb-panel-hints-desc">{hint.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
