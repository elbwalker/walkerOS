import React from 'react';

export interface MappingInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: 'text' | 'number';
  title?: string;
  className?: string;
  autoFocus?: boolean;
}

/**
 * MappingInput - Standardized input component for mapping editor
 *
 * Features:
 * - Consistent styling across all mapping panes
 * - Theme-aware colors (input background, border, focus states)
 * - Monospace font for property paths and values
 * - Hover and focus states
 * - Optional disabled state with visual feedback
 * - Type support for text and number inputs
 *
 * Used by:
 * - Name pane (event name override)
 * - Entity pane (action name input)
 * - Batch pane (number input)
 * - ValueType pane (quick value string)
 *
 * @example
 * <MappingInput
 *   value={name}
 *   onChange={setName}
 *   placeholder="e.g., page_view"
 * />
 */
export function MappingInput({
  value,
  onChange,
  onBlur,
  onClick,
  onKeyDown,
  placeholder,
  disabled = false,
  type = 'text',
  title,
  className = '',
  autoFocus = false,
}: MappingInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <input
      type={type}
      className={`elb-mapping-input ${disabled ? 'is-disabled' : ''} ${className}`}
      value={value}
      onChange={handleChange}
      onBlur={onBlur}
      onClick={onClick}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      title={title}
      autoFocus={autoFocus}
    />
  );
}
