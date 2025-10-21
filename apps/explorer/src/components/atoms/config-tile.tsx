import React from 'react';

export interface ConfigTileStatus {
  enabled: boolean;
  text?: string;
  maxLength?: number;
}

export interface ConfigTileProps {
  label: string;
  description: string;
  status: ConfigTileStatus;
  onClick: () => void;
  className?: string;
}

/**
 * ConfigTile - Reusable tile component for configuration options
 *
 * Features:
 * - Status indicator (green/gray circle)
 * - Optional status text with fade effect for long values
 * - Hover states with theme colors
 * - Automatic styling based on enabled state
 *
 * Used by:
 * - Rule overview (name, data, settings, batch, ignore, etc.)
 * - ValueConfig options (key, value, fn, map, loop, etc.)
 *
 * @example
 * <ConfigTile
 *   label="Name"
 *   description="Override the destination event name"
 *   status={{ enabled: true, text: "page_view" }}
 *   onClick={() => handleEdit('name')}
 * />
 */
export function ConfigTile({
  label,
  description,
  status,
  onClick,
  className = '',
}: ConfigTileProps) {
  const maxLength = status.maxLength || 20;
  const isLongText = (status.text?.length || 0) > maxLength;

  return (
    <button
      className={`elb-config-tile ${status.enabled ? 'is-enabled' : ''} ${className}`}
      onClick={onClick}
      type="button"
    >
      <div className="elb-config-tile-header">
        <div className="elb-config-tile-label">{label}</div>
        <div className="elb-config-tile-status">
          <div
            className={`elb-config-tile-indicator ${
              status.enabled ? 'is-enabled' : 'is-disabled'
            }`}
          />
          {status.text && (
            <div
              className={`elb-config-tile-status-text ${isLongText ? 'is-long' : ''}`}
            >
              {status.text}
            </div>
          )}
        </div>
      </div>

      <div className="elb-config-tile-description">{description}</div>
    </button>
  );
}

// Legacy export for backward compatibility during migration
export type RuleTileStatus = ConfigTileStatus;
export type RuleTileProps = ConfigTileProps;
export const RuleTile = ConfigTile;
