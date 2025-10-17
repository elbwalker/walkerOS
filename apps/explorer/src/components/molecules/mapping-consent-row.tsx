import React from 'react';
import { IconButton } from '../atoms/icon-button';

export interface ConsentRowProps {
  consentType: string;
  granted: boolean;
  onConsentTypeChange: (value: string) => void;
  onGrantedChange: (value: boolean) => void;
  onRemove: () => void;
}

/**
 * ConsentRow - Single consent requirement row
 *
 * Displays a row for configuring a consent requirement with:
 * - Input field for consent type name (e.g., "functional", "marketing")
 * - Checkbox for granted/denied state (checked = true/granted required)
 * - "Granted" label next to checkbox
 * - Trash button to remove the row
 *
 * Layout: [Input 200px] [Checkbox] [Label "Granted"] [Trash Button]
 *
 * @example
 * <ConsentRow
 *   consentType="functional"
 *   granted={true}
 *   onConsentTypeChange={setType}
 *   onGrantedChange={setGranted}
 *   onRemove={handleRemove}
 * />
 */
export function ConsentRow({
  consentType,
  granted,
  onConsentTypeChange,
  onGrantedChange,
  onRemove,
}: ConsentRowProps) {
  return (
    <div className="elb-consent-row">
      <input
        type="text"
        className="elb-consent-input"
        value={consentType}
        onChange={(e) => onConsentTypeChange(e.target.value)}
        placeholder="e.g., functional"
      />
      <div className="elb-consent-checkbox-wrapper">
        <input
          type="checkbox"
          className="elb-rjsf-checkbox"
          checked={granted}
          onChange={(e) => onGrantedChange(e.target.checked)}
        />
        <span className="elb-consent-label">Required</span>
      </div>
      <IconButton
        icon="delete"
        variant="danger"
        onClick={onRemove}
        title="Remove consent requirement"
      />
    </div>
  );
}
