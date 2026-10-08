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
}

/**
 * ToggleButton - one button that switches between options. It shows the
 * option a click switches to, the next one after `value` (after the last,
 * the first), so its label names the action.
 *
 * Every label sits in the same grid cell and only the next one is visible,
 * so the button always takes the longest label's width and never changes
 * size. An `aria-label` should contain the shown word ("Show code" for
 * "Code").
 */
export function ToggleButton({
  options,
  value,
  onChange,
  className,
  ...rest
}: ToggleButtonProps) {
  const found = options.findIndex((option) => option.value === value);
  const current = found < 0 ? 0 : found;
  const next = options[(current + 1) % options.length];

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
          aria-hidden={option === next ? undefined : true}
        >
          {option.label}
        </span>
      ))}
    </button>
  );
}
