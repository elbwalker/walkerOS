import { Button } from '../../atoms/Button';

export interface ActionButtonProps {
  text: string;
  action: 'watch' | 'learn' | 'activate';
  onClick?: () => void;
  disabled?: boolean;
}

export const ActionButton = ({ text, action, onClick, disabled }: ActionButtonProps) => {
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
    />
  );
};