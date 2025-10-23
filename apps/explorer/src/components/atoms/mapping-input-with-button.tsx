import React from 'react';
import { MappingInput, type MappingInputProps } from './mapping-input';

export interface MappingInputWithButtonProps
  extends Omit<MappingInputProps, 'onKeyDown'> {
  /**
   * Handler called when submit button is clicked or Enter is pressed
   */
  onSubmit: () => void;

  /**
   * Label for the action button
   * Examples: "Create", "Open", "Add", "Add Key"
   */
  buttonLabel: string;

  /**
   * Whether to show the button
   * Typically true when input has content
   */
  showButton?: boolean;

  /**
   * Optional override for key down behavior
   */
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * MappingInputWithButton - Enhanced input with contextual action button
 *
 * Provides clear visual affordance for creation/navigation actions.
 * The button appears when the input has content and provides a
 * discoverable alternative to pressing Enter.
 *
 * Features:
 * - Inline action button with dynamic label
 * - Maintains keyboard shortcuts (Enter, Escape)
 * - Self-documenting UX (button shows what will happen)
 * - Mobile-friendly (tap target)
 *
 * Used by:
 * - Overview pane (entity creation/selection)
 * - Entity pane (action creation/selection)
 * - Map pane (key creation/selection)
 * - Consent pane (consent state creation)
 * - Tree sidebar (quick action creation)
 *
 * @example
 * <MappingInputWithButton
 *   value={entityName}
 *   onChange={setEntityName}
 *   onSubmit={handleCreateOrOpen}
 *   buttonLabel={exists ? "Open" : "Create"}
 *   showButton={entityName.trim().length > 0}
 *   placeholder="Type entity name..."
 * />
 */
export function MappingInputWithButton({
  value,
  onChange,
  onSubmit,
  buttonLabel,
  showButton = false,
  onKeyDown,
  placeholder,
  disabled = false,
  type = 'text',
  title,
  className = '',
  autoFocus = false,
  onBlur,
  onClick,
}: MappingInputWithButtonProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Always check for Enter first
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
      return;
    }

    // Then delegate to custom handler if provided
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent any form submission
    onSubmit();
  };

  // Determine if button should be visible
  const isButtonVisible = showButton && value.trim().length > 0;

  return (
    <div className="elb-mapping-input-with-button">
      <MappingInput
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        onClick={onClick}
        placeholder={placeholder}
        disabled={disabled}
        type={type}
        title={title}
        className={className}
        autoFocus={autoFocus}
      />
      {isButtonVisible && (
        <button
          type="button"
          className="elb-mapping-input-button"
          onClick={handleButtonClick}
          disabled={disabled}
        >
          {buttonLabel}
        </button>
      )}
    </div>
  );
}
