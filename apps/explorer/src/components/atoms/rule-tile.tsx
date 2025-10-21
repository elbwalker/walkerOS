import React from 'react';

export interface RuleTileStatus {
  enabled: boolean;
  text?: string;
  maxLength?: number;
}

export interface RuleTileProps {
  label: string;
  description: string;
  status: RuleTileStatus;
  onClick: () => void;
  className?: string;
}

/**
 * RuleTile - Reusable tile component for rule configuration
 *
 * Features:
 * - Status indicator (green/gray circle)
 * - Optional status text with fade effect for long values
 * - Hover states with theme colors
 * - Automatic styling based on enabled state
 *
 * @example
 * <RuleTile
 *   label="Name"
 *   description="Override the destination event name"
 *   status={{ enabled: true, text: "page_view" }}
 *   onClick={() => handleEdit('name')}
 * />
 */
export function RuleTile({
  label,
  description,
  status,
  onClick,
  className = '',
}: RuleTileProps) {
  const maxLength = status.maxLength || 20;
  const isLongText = (status.text?.length || 0) > maxLength;

  return (
    <button
      className={`elb-rule-tile ${status.enabled ? 'is-enabled' : ''} ${className}`}
      onClick={onClick}
      type="button"
    >
      <div className="elb-rule-tile-header">
        <div className="elb-rule-tile-label">{label}</div>
        <div className="elb-rule-tile-status">
          <div
            className={`elb-rule-tile-indicator ${
              status.enabled ? 'is-enabled' : 'is-disabled'
            }`}
          />
          {status.text && (
            <div
              className={`elb-rule-tile-status-text ${isLongText ? 'is-long' : ''}`}
            >
              {status.text}
            </div>
          )}
        </div>
      </div>

      <div className="elb-rule-tile-description">{description}</div>
    </button>
  );
}
