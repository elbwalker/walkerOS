import type { WalkerOSTagging } from '../types';
import React from 'react';
import './button.css';

interface ButtonProps extends WalkerOSTagging {
  /**
   * Is this the principal call to action on the page?
   */
  primary?: boolean;
  /**
   * What background color to use
   */
  backgroundColor?: string;
  /**
   * How large should the button be?
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * Button contents
   */
  label: string;
  /**
   * Optional click handler
   */
  onClick?: () => void;
}

/**
 * Primary UI component for user interaction
 */
export const Button = ({
  primary = false,
  size = 'medium',
  backgroundColor,
  label,
  ...props
}: ButtonProps) => {
  const mode = primary
    ? 'storybook-button--primary'
    : 'storybook-button--secondary';

  const elbEntity = props.elbEntity || 'page';

  return (
    <button
      {...(elbEntity && { 'data-elb': elbEntity })}
      {...(props.elbTrigger && {
        'data-elbaction':
          props.elbTrigger + (props.elbAction ? ':' + props.elbAction : ''),
      })}
      {...(props.elbData && { [`data-elb-${elbEntity}`]: props.elbData })}
      {...(props.elbContext && { 'data-elbcontext': props.elbContext })}
      type="button"
      className={['storybook-button', `storybook-button--${size}`, mode].join(
        ' ',
      )}
      style={{ backgroundColor }}
      {...props}
    >
      {label}
    </button>
  );
};
