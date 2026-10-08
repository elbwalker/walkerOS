import type { SelectHTMLAttributes } from 'react';
import { fieldClassName } from '../Input';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'children'
> {
  options: Array<string | SelectOption>;
}

export const Select = ({ options, className = '', ...rest }: SelectProps) => (
  <select className={`${fieldClassName} ${className}`} {...rest}>
    {options.map((option) => {
      const { value, label } =
        typeof option === 'string' ? { value: option, label: option } : option;
      return (
        <option key={value} value={value}>
          {label}
        </option>
      );
    })}
  </select>
);
