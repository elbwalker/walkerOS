import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Icon, type IconName } from '../../atoms/Icon';

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

export interface DropdownProps<T extends string> {
  value: T;
  options: readonly DropdownOption<T>[];
  onChange: (value: T) => void;
  /** Names the choice for assistive tech, as in "Demo user: Lisa Loyal". */
  label: string;
  /** A leading icon in the button. */
  icon?: IconName;
  className?: string;
}

const menuItems = (menu: HTMLElement | null): HTMLElement[] =>
  menu
    ? Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]'))
    : [];

/**
 * A compact dropdown: a button with the current option and a chevron, and
 * below it a menu of every option with the current one checked. A choice, an
 * Escape or a press outside closes it; arrow keys, Home and End move through
 * the open menu. Labels show as given: the caller translates them, or not.
 */
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  label,
  icon,
  className = '',
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const current = options.find((option) => option.value === value);

  // While open, the current option takes the focus and a press outside the
  // dropdown closes it.
  useEffect(() => {
    const root = rootRef.current;
    if (!open || !root) return;
    menuItems(menuRef.current)
      .find((item) => item.getAttribute('aria-checked') === 'true')
      ?.focus();
    const onPress = (event: MouseEvent) => {
      if (event.target instanceof Node && !root.contains(event.target))
        setOpen(false);
    };
    root.ownerDocument.addEventListener('mousedown', onPress);
    return () => root.ownerDocument.removeEventListener('mousedown', onPress);
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const choose = (next: T) => {
    close();
    if (next !== value) onChange(next);
  };

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = menuItems(menuRef.current);
    const index = items.findIndex(
      (item) => item === event.currentTarget.ownerDocument.activeElement,
    );
    const focus = (to: number) => {
      event.preventDefault();
      items[(to + items.length) % items.length]?.focus();
    };
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        close();
        break;
      case 'Tab':
        setOpen(false);
        break;
      case 'ArrowDown':
        focus(index + 1);
        break;
      case 'ArrowUp':
        focus(index - 1);
        break;
      case 'Home':
        focus(0);
        break;
      case 'End':
        focus(items.length - 1);
        break;
    }
  };

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${label}: ${current?.label ?? ''}`}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        onKeyDown={onButtonKeyDown}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-ui text-fg transition hover:bg-surface-2"
      >
        {icon && <Icon name={icon} className="size-5 text-fg-2" />}
        <span className="whitespace-nowrap">{current?.label}</span>
        <Icon
          name="chevron-down"
          className={`size-4 text-fg-2 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className="absolute top-full right-0 z-(--z-dropdown) mt-1 min-w-full rounded-md border border-border-strong bg-surface py-1"
        >
          {options.map((option) => {
            const checked = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                tabIndex={-1}
                onClick={() => choose(option.value)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-ui whitespace-nowrap text-fg hover:bg-surface-2 focus-visible:bg-surface-2"
              >
                <Icon
                  name="check"
                  className={`size-4 ${checked ? 'text-fg' : 'invisible'}`}
                />
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
