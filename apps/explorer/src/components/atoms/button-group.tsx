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
  /**
   * Visual style. `segmented` is the bordered pill (default, used in footers
   * and grids). `tabs` renders flat header tabs with a filled active state,
   * matching the step-detail modal tab style for use in box headers.
   */
  variant?: 'segmented' | 'tabs';
}

/**
 * ButtonGroup - Segmented control or header tabs
 *
 * Displays multiple buttons for switching between views (HTML/CSS/JS, etc.).
 * `variant="tabs"` renders them as flat header tabs instead of a pill.
 */
export function ButtonGroup({
  buttons,
  onButtonClick,
  className = '',
  variant = 'segmented',
}: ButtonGroupProps) {
  const variantClass =
    variant === 'tabs' ? ' elb-explorer-button-group--tabs' : '';
  return (
    <div className={`elb-explorer-button-group${variantClass} ${className}`}>
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
