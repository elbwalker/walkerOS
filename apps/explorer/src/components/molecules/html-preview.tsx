import React from 'react';
import type { WalkerOS } from '@walkeros/core';
import { Box } from '../atoms/box';
import { Preview } from './preview';

export interface HtmlPreviewProps {
  html: string;
  css?: string;
  theme?: 'light' | 'dark';
  label?: string;
  className?: string;
  onEvent?: (event: WalkerOS.Event) => void;
}

/**
 * HtmlPreview - Convenience wrapper around Box + Preview
 *
 * Provides backward compatibility with the old HtmlPreview API.
 * Internally uses the atomic Box and Preview components.
 *
 * @deprecated Consider using <Box><Preview /></Box> directly for better composability
 */
export function HtmlPreview({
  html,
  css = '',
  theme = 'light',
  label = 'Preview',
  className = '',
  onEvent,
}: HtmlPreviewProps) {
  return (
    <Box header={label} className={className}>
      <Preview html={html} css={css} theme={theme} onEvent={onEvent} />
    </Box>
  );
}
