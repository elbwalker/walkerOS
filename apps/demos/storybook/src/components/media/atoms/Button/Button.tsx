import type { WalkerOSTagging } from '@walkerOS/storybook-addon';
import './Button.css';

export interface ButtonProps extends WalkerOSTagging {
  primary?: boolean;
  backgroundColor?: string;
  size?: 'small' | 'medium' | 'large';
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}

export const Button = ({
  primary = false,
  size = 'medium',
  backgroundColor,
  disabled = false,
  label,
  elbAction,
  onClick,
}: ButtonProps) => {
  const mode = primary
    ? 'storybook-button--primary'
    : 'storybook-button--secondary';
  return (
    <button
      type="button"
      className={['storybook-button', `storybook-button--${size}`, mode].join(
        ' ',
      )}
      {...(elbAction ? { 'data-elbaction': 'click:' + elbAction } : {})}
      style={{ backgroundColor }}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
};
