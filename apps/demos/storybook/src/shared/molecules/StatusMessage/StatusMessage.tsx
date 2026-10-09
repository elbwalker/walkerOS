import type { HTMLAttributes } from 'react';
import { Icon, type IconName } from '../../atoms/Icon';
import { Text, type TextTone, type TextVariant } from '../../atoms/Text';

export type StatusTone = 'success' | 'danger' | 'warning' | 'info';

const icons: Record<StatusTone, IconName> = {
  success: 'check-circle',
  danger: 'x-circle',
  warning: 'warning',
  info: 'info',
};

const iconTones: Record<StatusTone, string> = {
  success: 'text-success',
  danger: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
};

export interface StatusMessageProps extends HTMLAttributes<HTMLDivElement> {
  tone: StatusTone;
  variant?: TextVariant;
  textTone?: TextTone;
}

/** A status as an icon and its words, never by colour alone. */
export const StatusMessage = ({
  tone,
  variant = 'ui',
  textTone = 'fg',
  className = '',
  children,
  ...rest
}: StatusMessageProps) => (
  <div className={`flex items-center gap-2 ${className}`} {...rest}>
    <Icon name={icons[tone]} className={`size-5 ${iconTones[tone]}`} />
    <Text as="span" variant={variant} tone={textTone}>
      {children}
    </Text>
  </div>
);
