import React from 'react';

export interface HeaderProps {
  label: string;
  children?: React.ReactNode;
}

export function Header({ label, children }: HeaderProps) {
  return (
    <div className="elb-explorer-header">
      <span className="elb-explorer-label">{label}</span>
      {children}
    </div>
  );
}
