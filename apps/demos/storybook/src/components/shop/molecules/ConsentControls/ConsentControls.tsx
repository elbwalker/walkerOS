import { Button } from '../../atoms/Button';

export interface ConsentControlsProps {
  onAccept: () => void;
  onDeny: () => void;
  onReset: () => void;
}

export const ConsentControls = ({
  onAccept,
  onDeny,
  onReset,
}: ConsentControlsProps) => (
  <div className="flex flex-wrap items-center gap-2">
    <Button variant="primary" size="sm" onClick={onAccept}>
      Accept
    </Button>
    <Button variant="secondary" size="sm" onClick={onReset}>
      Reset
    </Button>
    <Button variant="secondary" size="sm" onClick={onDeny}>
      Decline
    </Button>
  </div>
);
