import React from 'react';
import { HeaderButton } from '../atoms/header-button';

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
    <div className={`elb-button-group ${className}`}>
      {buttons.map((button) => (
        <HeaderButton
          key={button.value}
          active={button.active}
          onClick={() => onButtonClick(button.value)}
        >
          {button.label}
        </HeaderButton>
      ))}
    </div>
  );
}
