import React, { useState, useRef, useEffect } from 'react';
import { Header } from './header';

export interface BoxProps {
  header: string;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  minHeight?: number | string;
  maxHeight?: number | string;
  tiny?: boolean;
  resizable?: boolean;
}

/**
 * Box - Container atom component
 *
 * Provides a consistent box container with header and content area.
 * Used across all explorer components for consistent styling.
 *
 * Height behavior:
 * - Default: minHeight 100px, grows as needed
 * - tiny prop: sets minHeight to 100px explicitly
 * - Custom minHeight/maxHeight: override defaults
 * - In Grid: fills row height (equal heights per row)
 *
 * @example
 * <Box header="Preview">
 *   <Preview html={html} css={css} />
 * </Box>
 *
 * @example
 * <Box header="Code" minHeight={200} maxHeight={600}>
 *   <CodeBox ... />
 * </Box>
 */
export function Box({
  header,
  headerActions,
  footer,
  children,
  className = '',
  style,
  minHeight,
  maxHeight,
  tiny = false,
  resizable = false,
}: BoxProps) {
  const boxStyle: React.CSSProperties = { ...style };

  if (tiny) {
    boxStyle.height = 'auto';
    boxStyle.minHeight =
      minHeight !== undefined
        ? typeof minHeight === 'number'
          ? `${minHeight}px`
          : minHeight
        : '100px';
  } else if (minHeight !== undefined) {
    boxStyle.minHeight =
      typeof minHeight === 'number' ? `${minHeight}px` : minHeight;
  }

  if (maxHeight !== undefined) {
    boxStyle.maxHeight =
      typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;
  }

  if (resizable) {
    boxStyle.resize = 'vertical';
    boxStyle.overflow = 'auto';
  }

  return (
    <div className={`elb-explorer-box ${className}`} style={boxStyle}>
      <Header label={header}>{headerActions}</Header>
      <div className="elb-explorer-content">{children}</div>
      {footer && <div className="elb-explorer-footer">{footer}</div>}
    </div>
  );
}
