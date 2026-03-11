import { useState, useRef, useEffect, useCallback } from 'react';
import type { RefObject } from 'react';

export interface UseDropdownReturn {
  /** Whether dropdown is currently open */
  isOpen: boolean;
  /** Toggle dropdown open/closed */
  toggle: () => void;
  /** Open the dropdown */
  open: () => void;
  /** Close the dropdown */
  close: () => void;
  /** Ref to attach to the container element for click-outside detection */
  containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * useDropdown - Manages dropdown open/close state with click-outside and keyboard handling
 *
 * Provides:
 * - Open/close state management
 * - Click-outside detection to close
 * - Escape key handling to close
 *
 * @example
 * const { isOpen, toggle, close, containerRef } = useDropdown();
 *
 * return (
 *   <div ref={containerRef}>
 *     <Dropdown isOpen={isOpen} onToggle={toggle}>
 *       ...
 *     </Dropdown>
 *   </div>
 * );
 */
export function useDropdown(): UseDropdownReturn {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return {
    isOpen,
    toggle,
    open,
    close,
    containerRef,
  };
}
