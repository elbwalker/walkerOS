import type { WalkerOSAddon } from '../types';
import React from 'react';
import { Button } from 'storybook/internal/components';
import { useTheme } from 'storybook/theming';

interface HighlightButtonsProps {
  highlights: {
    context: boolean;
    entity: boolean;
    property: boolean;
    action: boolean;
  };
  toggleHighlight: (type: keyof HighlightButtonsProps['highlights']) => void;
}

export const HighlightButtons: React.FC<HighlightButtonsProps> = ({
  highlights,
  toggleHighlight,
}) => {
  const theme = useTheme();

  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          fontSize: '12px',
          color: theme.color.mediumdark,
          marginRight: '8px',
        }}
      >
        Highlight:
      </span>
      <Button
        size="small"
        variant={highlights.context ? 'solid' : 'outline'}
        onClick={() => toggleHighlight('context')}
        style={{
          fontSize: '11px',
          padding: '4px 8px',
          backgroundColor: highlights.context ? '#ffbd44cc' : 'transparent',
          color: highlights.context ? '#000' : theme.color.mediumdark,
          border: `1px solid ${highlights.context ? '#ffbd44' : theme.color.border}`,
        }}
      >
        Context
      </Button>
      <Button
        size="small"
        variant={highlights.entity ? 'solid' : 'outline'}
        onClick={() => toggleHighlight('entity')}
        style={{
          fontSize: '11px',
          padding: '4px 8px',
          backgroundColor: highlights.entity ? '#00ca4ecc' : 'transparent',
          color: highlights.entity ? '#fff' : theme.color.mediumdark,
          border: `1px solid ${highlights.entity ? '#00ca4e' : theme.color.border}`,
        }}
      >
        Entity
      </Button>
      <Button
        size="small"
        variant={highlights.property ? 'solid' : 'outline'}
        onClick={() => toggleHighlight('property')}
        style={{
          fontSize: '11px',
          padding: '4px 8px',
          backgroundColor: highlights.property ? '#ff605ccc' : 'transparent',
          color: highlights.property ? '#fff' : theme.color.mediumdark,
          border: `1px solid ${highlights.property ? '#ff605c' : theme.color.border}`,
        }}
      >
        Property
      </Button>
      <Button
        size="small"
        variant={highlights.action ? 'solid' : 'outline'}
        onClick={() => toggleHighlight('action')}
        style={{
          fontSize: '11px',
          padding: '4px 8px',
          backgroundColor: highlights.action ? '#9900ffcc' : 'transparent',
          color: highlights.action ? '#fff' : theme.color.mediumdark,
          border: `1px solid ${highlights.action ? '#9900ff' : theme.color.border}`,
        }}
      >
        Action
      </Button>
    </div>
  );
};
