import type { WalkerOSAddon } from '../types';
import React from 'react';
import { Button } from 'storybook/internal/components';
import { useTheme } from 'storybook/theming';
import { vizBg } from '@walkeros/explorer/design';
import { highlightColors, type HighlightKind } from '../utils/eventColors';

interface HighlightButtonsProps {
  highlights: Record<HighlightKind, boolean>;
  toggleHighlight: (type: HighlightKind) => void;
}

const BUTTONS: Array<{ kind: HighlightKind; label: string }> = [
  { kind: 'globals', label: 'Globals' },
  { kind: 'context', label: 'Context' },
  { kind: 'entity', label: 'Entity' },
  { kind: 'property', label: 'Property' },
  { kind: 'action', label: 'Action' },
];

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
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
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
      {BUTTONS.map(({ kind, label }) => {
        const active = highlights[kind];
        const color = highlightColors[kind];

        return (
          <Button
            key={kind}
            size="small"
            variant={active ? 'solid' : 'outline'}
            onClick={() => toggleHighlight(kind)}
            style={{
              fontSize: '11px',
              padding: '4px 8px',
              // Active: the event colour on the dark visualisation ground.
              backgroundColor: active ? vizBg : 'transparent',
              color: active ? color : theme.color.mediumdark,
              border: `1px solid ${active ? color : theme.color.border}`,
            }}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
};
