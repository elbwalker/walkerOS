import React from 'react';
import { Header } from './header';

export interface BoxProps {
  header: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Box - Container atom component
 *
 * Provides a consistent box container with header and content area.
 * Used across all explorer components for consistent styling.
 *
 * @example
 * <Box header="Preview">
 *   <Preview html={html} css={css} />
 * </Box>
 */
export function Box({
  header,
  headerActions,
  children,
  className = '',
}: BoxProps) {
  return (
    <div className={`elb-explorer-box ${className}`}>
      <Header label={header}>{headerActions}</Header>
      <div className="elb-explorer-content">{children}</div>
    </div>
  );
}
