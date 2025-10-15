import React from 'react';

export interface PanelHeaderProps {
  label: string;
  children?: React.ReactNode;
}

export function PanelHeader({ label, children }: PanelHeaderProps) {
  return (
    <div className="elb-explorer-mapping-header">
      <span className="elb-explorer-mapping-label">{label}</span>
      {children}
    </div>
  );
}
