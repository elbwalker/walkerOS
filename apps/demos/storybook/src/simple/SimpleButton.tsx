import React from 'react';

interface SimpleButtonProps {
  label: string;
  elbEntity?: string;
  elbAction?: string;
  elbData?: string;
  onClick?: () => void;
}

export const SimpleButton: React.FC<SimpleButtonProps> = ({
  label,
  elbEntity,
  elbAction,
  elbData,
  onClick,
}) => {
  const dataAttributes: Record<string, string> = {};

  if (elbEntity) dataAttributes['data-elb'] = elbEntity;
  if (elbAction) dataAttributes['data-elbaction'] = elbAction;
  if (elbData) dataAttributes['data-elbdata'] = elbData;

  return (
    <button
      {...dataAttributes}
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
