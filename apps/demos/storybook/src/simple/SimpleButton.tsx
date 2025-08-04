import React from 'react';
import { createTrackingProps, type DataElb } from '../utils/tagger';

interface SimpleButtonProps {
  label: string;
  onClick?: () => void;
  dataElb?: DataElb;
}

export const SimpleButton: React.FC<SimpleButtonProps> = ({
  label,
  onClick,
  dataElb,
}) => {
  // Generate walkerOS tracking properties from dataElb configuration
  const trackingProps = createTrackingProps(dataElb);

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
