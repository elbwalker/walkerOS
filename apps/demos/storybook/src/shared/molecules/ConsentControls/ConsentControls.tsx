import { Button } from '../../atoms/Button';
import { useText } from '../../language';

export interface ConsentControlsProps {
  onAccept: () => void;
  onDeny: () => void;
  onReset: () => void;
}

export const ConsentControls = ({
  onAccept,
  onDeny,
  onReset,
}: ConsentControlsProps) => {
  const t = useText();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="primary" size="sm" onClick={onAccept}>
        {t('Accept')}
      </Button>
      <Button variant="secondary" size="sm" onClick={onReset}>
        {t('Reset')}
      </Button>
      <Button variant="secondary" size="sm" onClick={onDeny}>
        {t('Decline')}
      </Button>
    </div>
  );
};
