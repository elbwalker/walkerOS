import type { WalkerOSAddon } from '../types';
import React from 'react';
import { Button } from 'storybook/internal/components';
import { useTheme } from 'storybook/theming';

interface HighlightButtonsProps {
  config: WalkerOSAddon;
  toggleHighlight: (type: keyof WalkerOSAddon['highlights']) => void;
}

export const HighlightButtons: React.FC<HighlightButtonsProps> = ({
  config,
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
        variant={config.highlights?.context ? 'solid' : 'outline'}
        onClick={() => toggleHighlight('context')}
        style={{
          fontSize: '11px',
          padding: '4px 8px',
          backgroundColor: config.highlights?.context
            ? '#ffbd44cc'
            : 'transparent',
          color: config.highlights?.context ? '#000' : theme.color.mediumdark,
          border: `1px solid ${config.highlights?.context ? '#ffbd44' : theme.color.border}`,
        }}
      >
        Context
      </Button>
      <Button
        size="small"
        variant={config.highlights?.entity ? 'solid' : 'outline'}
        onClick={() => toggleHighlight('entity')}
        style={{
          fontSize: '11px',
          padding: '4px 8px',
          backgroundColor: config.highlights?.entity
            ? '#00ca4ecc'
            : 'transparent',
          color: config.highlights?.entity ? '#fff' : theme.color.mediumdark,
          border: `1px solid ${config.highlights?.entity ? '#00ca4e' : theme.color.border}`,
        }}
      >
        Entity
      </Button>
      <Button
        size="small"
        variant={config.highlights?.property ? 'solid' : 'outline'}
        onClick={() => toggleHighlight('property')}
        style={{
          fontSize: '11px',
          padding: '4px 8px',
          backgroundColor: config.highlights?.property
            ? '#ff605ccc'
            : 'transparent',
          color: config.highlights?.property ? '#fff' : theme.color.mediumdark,
          border: `1px solid ${config.highlights?.property ? '#ff605c' : theme.color.border}`,
        }}
      >
        Property
      </Button>
      <Button
        size="small"
        variant={config.highlights?.action ? 'solid' : 'outline'}
        onClick={() => toggleHighlight('action')}
        style={{
          fontSize: '11px',
          padding: '4px 8px',
          backgroundColor: config.highlights?.action
            ? '#9900ffcc'
            : 'transparent',
          color: config.highlights?.action ? '#fff' : theme.color.mediumdark,
          border: `1px solid ${config.highlights?.action ? '#9900ff' : theme.color.border}`,
        }}
      >
        Action
      </Button>
    </div>
  );
};
