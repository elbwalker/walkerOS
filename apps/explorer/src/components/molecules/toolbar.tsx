import { useState } from 'react';
import { Button } from '../ui/button';

export interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

export function ToolbarButton({ icon, label, onClick }: ToolbarButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <Button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={label}
      >
        {icon}
      </Button>
      {showTooltip && <div className="explorer-tooltip">{label}</div>}
    </div>
  );
}
