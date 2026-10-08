import { createTrackingProps, type DataElb } from '../../../../utils/tagger';

export interface ButtonProps {
  primary?: boolean;
  size?: 'small' | 'medium' | 'large';
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  dataElb?: DataElb;
}

const sizeClasses = {
  small: 'px-3 py-1.5 text-small',
  medium: 'px-5 py-2.5 text-ui font-semibold',
  large: 'px-6 py-3 text-body-lg font-semibold',
};

const variantClasses = {
  primary: 'border-primary bg-primary text-on-primary hover:opacity-90',
  secondary: 'border-border-strong bg-surface text-fg hover:bg-surface-2',
};

export const Button = ({
  primary = false,
  size = 'medium',
  disabled = false,
  label,
  onClick,
  dataElb,
}: ButtonProps) => {
  const trackingProps = createTrackingProps(dataElb, 'Button');

  return (
    <button
      type="button"
      className={[
        'inline-block cursor-pointer rounded-md border transition disabled:cursor-not-allowed disabled:opacity-50',
        sizeClasses[size],
        variantClasses[primary ? 'primary' : 'secondary'],
      ].join(' ')}
      {...trackingProps}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
};
