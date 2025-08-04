import './Button.css';
import { createTrackingProps, type DataElb } from '../../../../utils/tagger';

export interface ButtonProps {
  primary?: boolean;
  backgroundColor?: string;
  size?: 'small' | 'medium' | 'large';
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  dataElb?: DataElb;
}

export const Button = ({
  primary = false,
  size = 'medium',
  backgroundColor,
  disabled = false,
  label,
  onClick,
  dataElb,
}: ButtonProps) => {
  const mode = primary
    ? 'storybook-button--primary'
    : 'storybook-button--secondary';

  // Generate walkerOS tracking properties from dataElb configuration
  const trackingProps = createTrackingProps(dataElb);

  return (
    <button
      type="button"
      className={['storybook-button', `storybook-button--${size}`, mode].join(
        ' ',
      )}
      {...trackingProps}
      style={{ backgroundColor }}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
};
