import React, { useState, useRef, useEffect } from 'react';

export interface AutoSelectProps {
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  value?: string;
  className?: string;
}

/**
 * AutoSelect - Autocomplete dropdown component
 *
 * Features:
 * - Filter options as user types
 * - Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
 * - Mouse click selection
 * - Theme-aware styling via CSS variables
 *
 * @example
 * <AutoSelect
 *   options={['product view', 'product add', 'order complete']}
 *   onSelect={(value) => console.log(value)}
 *   placeholder="Select mapping rule..."
 * />
 */
export function AutoSelect({
  options,
  onSelect,
  placeholder = 'Select...',
  value = '',
  className = '',
}: AutoSelectProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on input value
  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(inputValue.toLowerCase()),
  );

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
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
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleOptionClick = (option: string) => {
    setInputValue(option);
    setIsOpen(false);
    onSelect(option);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleOptionClick(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
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

  return (
    <div className={`elb-auto-select ${className}`} ref={dropdownRef}>
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
      {isOpen && filteredOptions.length > 0 && (
        <div className="elb-auto-select-dropdown">
          {filteredOptions.map((option, index) => (
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
        </div>
      )}
      {isOpen && filteredOptions.length === 0 && inputValue && (
        <div className="elb-auto-select-dropdown">
          <div className="elb-auto-select-option elb-auto-select-no-results">
            No results found
          </div>
        </div>
      )}
    </div>
  );
}
