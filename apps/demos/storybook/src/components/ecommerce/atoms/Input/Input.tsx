import React from 'react';
import './Input.css';

export interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  value?: string;
  disabled?: boolean;
  error?: boolean;
  size?: 'small' | 'medium' | 'large';
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const Input = ({
  type = 'text',
  size = 'medium',
  error = false,
  disabled = false,
  ...props
}: InputProps) => {
  const errorClass = error ? 'storybook-input--error' : '';
  return (
    <input
      type={type}
      className={[
        'storybook-input',
        `storybook-input--${size}`,
        errorClass,
      ].join(' ')}
      disabled={disabled}
      {...props}
    />
  );
};
