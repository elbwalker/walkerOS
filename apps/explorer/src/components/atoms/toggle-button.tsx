import React, { type ButtonHTMLAttributes } from 'react';

export interface ToggleButtonOption {
  label: string;
  value: string;
}

export interface ToggleButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'onChange' | 'onClick' | 'type' | 'value'
> {
  options: ToggleButtonOption[];
  value: string;
  onChange: (value: string) => void;
  /**
   * Which label the button shows: the option a click switches to (`next`,
   * the default, so the label names the action) or the selected one
   * (`current`, so the label names the state).
   */
  shows?: 'next' | 'current';
}

/**
 * ToggleButton - one button that switches between options. A click selects
 * the next option after `value` (after the last, the first). By default it
 * shows that next option, so its label names the action; with
 * `shows="current"` it shows the selected one.
 *
 * Every label sits in the same grid cell and only one is visible, so the
 * button always takes the longest label's width and never changes size. An
 * `aria-label` should contain the shown word ("Show code" for "Code").
 */
export function ToggleButton({
  options,
  value,
  onChange,
  shows = 'next',
  className,
  ...rest
}: ToggleButtonProps) {
  const found = options.findIndex((option) => option.value === value);
  const current = found < 0 ? 0 : found;
  const next = options[(current + 1) % options.length];
  const shown = shows === 'current' ? options[current] : next;

  return (
    <button
      {...rest}
      type="button"
      className={['elb-explorer-toggle', className].filter(Boolean).join(' ')}
      onClick={() => {
        if (next) onChange(next.value);
      }}
    >
      {options.map((option) => (
        <span
          key={option.value}
          className="elb-explorer-toggle__label"
          aria-hidden={option === shown ? undefined : true}
        >
          {option.label}
        </span>
      ))}
    </button>
  );
}
