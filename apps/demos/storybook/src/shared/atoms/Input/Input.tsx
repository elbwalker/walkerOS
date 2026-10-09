import type { InputHTMLAttributes } from 'react';

export const fieldClassName =
  'block w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-ui font-normal text-fg placeholder:text-fg-3';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = ({
  type = 'text',
  className = '',
  ...rest
}: InputProps) => (
  <input type={type} className={`${fieldClassName} ${className}`} {...rest} />
);
