import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}

export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  id,
}: ToggleProps) {
  const toggleId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="elb-toggle-container">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        id={toggleId}
        className={`elb-toggle ${checked ? 'elb-toggle-checked' : ''} ${
          disabled ? 'elb-toggle-disabled' : ''
        }`}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
      >
        <span className="elb-toggle-slider" />
      </button>
      {label && (
        <label htmlFor={toggleId} className="elb-toggle-label">
          {label}
        </label>
      )}
    </div>
  );
}
