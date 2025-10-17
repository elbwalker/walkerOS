import React, { useState, useRef, useEffect } from 'react';

export interface AutoSelectProps {
  options: string[];
  onSelect: (value: string, isNew?: boolean) => void;
  placeholder?: string;
  value?: string;
  className?: string;
  onClear?: () => void;
}

/**
 * AutoSelect - Autocomplete dropdown component
 *
 * Features:
 * - Shows all entries on click/focus
 * - Filters only when user types (starts from first character)
 * - Scrollable list when more than 5 items
 * - Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
 * - Mouse click selection
 * - Shows "(create)" indicator for valid new rules (entity action format)
 * - Theme-aware styling via CSS variables
 *
 * @example
 * <AutoSelect
 *   options={['product view', 'product add', 'order complete']}
 *   onSelect={(value, isNew) => console.log(value, isNew)}
 *   placeholder="Select mapping rule..."
 * />
 */
export function AutoSelect({
  options,
  onSelect,
  placeholder = 'Select...',
  value = '',
  className = '',
  onClear,
}: AutoSelectProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [userHasTyped, setUserHasTyped] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options only when user has typed
  const filteredOptions =
    userHasTyped && inputValue.trim() !== ''
      ? options.filter((option) =>
          option.toLowerCase().startsWith(inputValue.toLowerCase().trim()),
        )
      : options;

  // Show scrollbar when more than 5 items
  const displayOptions = filteredOptions;

  // Validate entity action format (must have exactly one space)
  const isValidFormat = (text: string): boolean => {
    const trimmed = text.trim();
    const parts = trimmed.split(' ');
    return parts.length === 2 && parts[0] !== '' && parts[1] !== '';
  };

  // Check if input value is a new rule (not in existing options and valid format)
  const isNewRule =
    inputValue.trim() !== '' &&
    isValidFormat(inputValue.trim()) &&
    !options.some(
      (option) => option.toLowerCase() === inputValue.toLowerCase().trim(),
    );

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
    setUserHasTyped(false);
  }, [value]);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions.length]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setUserHasTyped(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setUserHasTyped(true);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setUserHasTyped(false); // Show all options on focus
  };

  const handleOptionClick = (option: string, isNew = false) => {
    setInputValue(option);
    setIsOpen(false);
    setUserHasTyped(false);
    onSelect(option, isNew);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      setUserHasTyped(false);
      return;
    }

    const totalOptions = displayOptions.length + (isNewRule ? 1 : 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < totalOptions - 1 ? prev + 1 : prev,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (isNewRule && highlightedIndex === displayOptions.length) {
          // Create new rule
          handleOptionClick(inputValue.trim(), true);
        } else if (displayOptions[highlightedIndex]) {
          handleOptionClick(displayOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setUserHasTyped(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`,
      );
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    setInputValue('');
    setUserHasTyped(false);
    setIsOpen(false);
    onClear?.();
  };

  return (
    <div className={`elb-auto-select ${className}`} ref={dropdownRef}>
      <div className="elb-auto-select-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="elb-auto-select-input"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
        />
        {onClear && inputValue && (
          <button
            type="button"
            className="elb-auto-select-clear"
            onClick={handleClear}
            title="Clear selection"
          >
            ×
          </button>
        )}
      </div>
      {isOpen && (displayOptions.length > 0 || isNewRule) && (
        <div
          className={`elb-auto-select-dropdown ${displayOptions.length > 5 ? 'scrollable' : ''}`}
        >
          {displayOptions.map((option, index) => (
            <div
              key={option}
              data-index={index}
              className={`elb-auto-select-option ${
                index === highlightedIndex ? 'highlighted' : ''
              }`}
              onClick={() => handleOptionClick(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {option}
            </div>
          ))}
          {isNewRule && (
            <div
              data-index={displayOptions.length}
              className={`elb-auto-select-option ${
                highlightedIndex === displayOptions.length ? 'highlighted' : ''
              }`}
              onClick={() => handleOptionClick(inputValue.trim(), true)}
              onMouseEnter={() => setHighlightedIndex(displayOptions.length)}
            >
              <span>{inputValue.trim()}</span>
              <span className="elb-auto-select-create-label"> (create)</span>
            </div>
          )}
        </div>
      )}
      {isOpen && displayOptions.length === 0 && !isNewRule && userHasTyped && (
        <div className="elb-auto-select-dropdown">
          <div className="elb-auto-select-option elb-auto-select-no-results">
            No results found
          </div>
        </div>
      )}
    </div>
  );
}
