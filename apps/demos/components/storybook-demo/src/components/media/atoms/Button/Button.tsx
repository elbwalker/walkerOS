import './Button.css';

export interface Tracking {
  elbContext?: string;
  elbAction?: string;
  elbValue?: string;
}

export interface ButtonProps extends Tracking {
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
