import { Button } from '../../atoms/Button';
import type { WalkerOSTagging } from '@walkerOS/storybook-addon';

export interface ActionButtonProps extends WalkerOSTagging {
  text: string;
  action: 'watch' | 'learn' | 'activate';
  onClick?: () => void;
  disabled?: boolean;
}

export const ActionButton = ({
  text,
  action,
  onClick,
  disabled,
  elbEntity,
}: ActionButtonProps) => {
  console.log("🚀 ~ elbEntity:", elbEntity)
  const getPrimary = () => {
    switch (action) {
      case 'watch':
        return true;
      case 'learn':
        return false;
      case 'activate':
        return true;
      default:
        return true;
    }
  };

  const getBackgroundColor = () => {
    switch (action) {
      case 'activate':
        return 'var(--color-foreground)';
      default:
        return undefined;
    }
  };

  return (
    <Button
      primary={getPrimary()}
      backgroundColor={getBackgroundColor()}
      label={text}
      onClick={onClick}
      disabled={disabled}
      elbEntity={elbEntity}
      elbAction="click"
      elbData={`type:primary;cta:${text}`}
    />
  );
};
