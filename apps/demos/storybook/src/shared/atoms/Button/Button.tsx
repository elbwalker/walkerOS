import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'link' | 'icon';
export type ButtonSize = 'md' | 'sm';

// The boxed variants: their look, then their size.
const boxedLook = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-md bg-primary font-semibold text-on-primary transition hover:opacity-90',
  secondary:
    'inline-flex items-center justify-center gap-2 rounded-md border border-border-strong bg-surface font-semibold text-fg transition hover:bg-surface-2',
};

const boxedSize: Record<ButtonSize, string> = {
  md: 'px-4 py-2 text-body',
  sm: 'px-3 py-1.5 text-small',
};

export const buttonVariants: Record<ButtonVariant, string> = {
  primary: `${boxedLook.primary} ${boxedSize.md}`,
  secondary: `${boxedLook.secondary} ${boxedSize.md}`,
  link: 'inline-flex items-center gap-1 text-body font-semibold text-link hover:underline',
  icon: 'inline-flex items-center justify-center rounded-full p-2 text-fg-3 transition hover:bg-surface-2 hover:text-fg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Applies to the boxed variants (`primary`, `secondary`). */
  size?: ButtonSize;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  ...rest
}: ButtonProps) => {
  const look =
    variant === 'primary' || variant === 'secondary'
      ? `${boxedLook[variant]} ${boxedSize[size]}`
      : buttonVariants[variant];
  return <button type={type} className={`${look} ${className}`} {...rest} />;
};
