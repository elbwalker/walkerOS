import React from 'react';
import { Button } from './button';

export interface ButtonGroupProps {
  buttons: Array<{
    label: string;
    value: string;
    active?: boolean;
  }>;
  onButtonClick: (value: string) => void;
  className?: string;
}

/**
 * ButtonGroup - Segmented control for headers
 *
 * Displays multiple buttons in a grouped segmented control style.
 * Commonly used for tab switching (HTML/CSS/JS, etc.)
 */
export function ButtonGroup({
  buttons,
  onButtonClick,
  className = '',
}: ButtonGroupProps) {
  return (
    <div className={`elb-explorer-button-group ${className}`}>
      {buttons.map((button) => (
        <Button
          key={button.value}
          active={button.active}
          onClick={() => onButtonClick(button.value)}
        >
          {button.label}
        </Button>
      ))}
    </div>
  );
}
