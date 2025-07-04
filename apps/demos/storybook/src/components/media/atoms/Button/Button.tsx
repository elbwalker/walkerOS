import './Button.css';

export interface ButtonProps {
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
  disabled = false,
  label,
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
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
};
