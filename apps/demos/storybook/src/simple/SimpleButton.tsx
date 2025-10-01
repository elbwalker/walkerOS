import React from 'react';
import { tagger } from '../utils/tagger';
import type { WalkerOS } from '@walkeros/core';

interface SimpleButtonProps {
  label: string;
  onClick?: () => void;
  entity?: string;
  action?: string;
  data?: WalkerOS.Properties;
}

export const SimpleButton: React.FC<SimpleButtonProps> = ({
  label,
  onClick,
  entity = 'button',
  action = 'click',
  data,
}) => {
  // Generate walkerOS tracking properties using tagger
  const trackingProps = tagger(entity)
    .data({ label, ...data })
    .action('click', action)
    .get();

  return (
    <button
      {...trackingProps}
      onClick={onClick}
      style={{
        backgroundColor: '#0066cc',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '4px',
        fontSize: '16px',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
};
