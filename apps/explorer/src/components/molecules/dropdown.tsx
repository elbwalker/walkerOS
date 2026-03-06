import React from 'react';

export interface DropdownProps {
  /** Trigger element (button, link, etc.) */
  trigger: React.ReactNode;
  /** Whether dropdown is open (controlled) */
  isOpen: boolean;
  /** Toggle handler */
  onToggle: () => void;
  /** Dropdown content */
  children: React.ReactNode;
  /** Alignment of dropdown panel */
  align?: 'left' | 'right';
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** Additional CSS class */
  className?: string;
}

export interface DropdownItemProps {
  /** Item content */
  children: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Visual variant */
  variant?: 'default' | 'danger';
  /** Additional CSS class */
  className?: string;
}

export interface DropdownDividerProps {
  /** Additional CSS class */
  className?: string;
}

/**
 * Dropdown - Generic dropdown container (UI only)
 *
 * Pure UI component for dropdown menus.
 * Click-outside and keyboard handling should be implemented in the parent
 * via hooks like useDropdown.
 *
 * @example
 * <Dropdown
 *   trigger={<button>Menu</button>}
 *   isOpen={isOpen}
 *   onToggle={toggle}
 *   align="right"
 * >
 *   <DropdownItem onClick={handleAction}>Action</DropdownItem>
 *   <DropdownDivider />
 *   <DropdownItem onClick={handleLogout} variant="danger">Logout</DropdownItem>
 * </Dropdown>
 */
export function Dropdown({
  trigger,
  isOpen,
  onToggle,
  children,
  align = 'left',
  ariaLabel,
  className = '',
}: DropdownProps) {
  return (
    <div className={`elb-dropdown ${className}`.trim()}>
      <div
        className="elb-dropdown__trigger"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        {trigger}
      </div>
      {isOpen && (
        <div
          className={`elb-dropdown__panel elb-dropdown__panel--${align}`}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * DropdownItem - Menu item within a dropdown
 *
 * @example
 * <DropdownItem onClick={handleClick}>Action</DropdownItem>
 */
export function DropdownItem({
  children,
  onClick,
  disabled = false,
  variant = 'default',
  className = '',
}: DropdownItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`elb-dropdown__item elb-dropdown__item--${variant} ${disabled ? 'elb-dropdown__item--disabled' : ''} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

/**
 * DropdownDivider - Visual separator between menu items
 *
 * @example
 * <DropdownDivider />
 */
export function DropdownDivider({ className = '' }: DropdownDividerProps) {
  return (
    <div
      className={`elb-dropdown__divider ${className}`.trim()}
      role="separator"
    />
  );
}
