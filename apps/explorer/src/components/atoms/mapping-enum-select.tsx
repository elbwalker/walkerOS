import React, { useState, useRef, useEffect } from 'react';

export interface MappingEnumSelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: Array<string | number>;
  placeholder?: string;
  type?: 'string' | 'number';
  autoFocus?: boolean;
}

/**
 * MappingEnumSelect - Autocomplete dropdown for enum fields
 *
 * Unified autocomplete/dropdown hybrid:
 * - Click or focus to show all options
 * - Type to filter options (autocomplete)
 * - Accept custom values (not in enum)
 * - Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
 * - Click-outside to close
 * - Monospace font consistent with other mapping inputs
 *
 * @example
 * <MappingEnumSelect
 *   value="PageView"
 *   onChange={setValue}
 *   options={['PageView', 'Purchase', 'AddToCart']}
 * />
 */
export function MappingEnumSelect({
  value,
  onChange,
  options,
  placeholder = 'Type or select...',
  type = 'string',
  autoFocus = false,
}: MappingEnumSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [inputValue, setInputValue] = useState(String(value || ''));
  const [hasTyped, setHasTyped] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update input value when prop changes externally
  useEffect(() => {
    setInputValue(String(value || ''));
    setHasTyped(false);
  }, [value]);

  // Reset highlighted index when dropdown opens or filter changes
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        // Commit the typed value on blur
        if (hasTyped && inputValue.trim() !== '') {
          onChange(type === 'number' ? Number(inputValue) : inputValue);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, hasTyped, inputValue, onChange, type]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (
      isOpen &&
      dropdownRef.current &&
      dropdownRef.current.children[highlightedIndex]
    ) {
      const highlighted = dropdownRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Filter options based on input
  const filteredOptions =
    hasTyped && inputValue.trim() !== ''
      ? options.filter((option) =>
          String(option)
            .toLowerCase()
            .includes(inputValue.toLowerCase().trim()),
        )
      : options;

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setHasTyped(true);
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  const handleOptionClick = (option: string | number) => {
    setInputValue(String(option));
    onChange(option);
    setIsOpen(false);
    setHasTyped(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (filteredOptions.length > 0) {
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev,
          );
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (isOpen && filteredOptions.length > 0) {
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (
          isOpen &&
          filteredOptions.length > 0 &&
          filteredOptions[highlightedIndex] !== undefined
        ) {
          handleOptionClick(filteredOptions[highlightedIndex]);
        } else {
          // Accept custom value
          const trimmedValue = inputValue.trim();
          if (trimmedValue !== '') {
            onChange(type === 'number' ? Number(trimmedValue) : trimmedValue);
            setIsOpen(false);
            setHasTyped(false);
          }
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        // Revert to original value
        setInputValue(String(value || ''));
        setHasTyped(false);
        break;

      case 'Tab':
        // Accept current typed value or highlighted option
        if (hasTyped && inputValue.trim() !== '') {
          onChange(type === 'number' ? Number(inputValue) : inputValue);
        }
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="elb-mapping-enum-select" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        className={`elb-mapping-enum-select-input ${isOpen ? 'is-open' : ''}`}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />

      {isOpen && (
        <div
          className={`elb-mapping-enum-select-dropdown ${
            filteredOptions.length > 5 ? 'scrollable' : ''
          }`}
          ref={dropdownRef}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={String(option)}
                className={`elb-mapping-enum-select-option ${
                  index === highlightedIndex ? 'is-highlighted' : ''
                } ${String(option) === String(value) ? 'is-selected' : ''}`}
                onClick={() => handleOptionClick(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {String(option)}
              </div>
            ))
          ) : (
            <div className="elb-mapping-enum-select-empty">
              No matching options. Press Enter to use custom value.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
