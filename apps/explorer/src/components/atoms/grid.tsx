import React from 'react';

export interface GridProps {
  children: React.ReactNode;
  columns?: number | string;
  gap?: number | string;
  className?: string;
}

/**
 * Grid - Layout component for arranging boxes
 *
 * Provides consistent grid layout for box components with automatic
 * equal heights per row. Boxes within the grid will fill available
 * height and align with siblings in the same row.
 *
 * @example
 * // 2 column grid
 * <Grid columns={2}>
 *   <CodeBox ... />
 *   <CodeBox ... />
 * </Grid>
 *
 * @example
 * // Custom column sizes
 * <Grid columns="1fr 2fr">
 *   <CodeBox ... />
 *   <CodeBox ... />
 * </Grid>
 *
 * @example
 * // Single column (default on mobile)
 * <Grid>
 *   <CodeBox ... />
 * </Grid>
 */
export function Grid({
  children,
  columns = 1,
  gap = 12,
  className = '',
}: GridProps) {
  const gridTemplateColumns =
    typeof columns === 'number' ? `repeat(${columns}, 1fr)` : columns;

  const gridGap = typeof gap === 'number' ? `${gap}px` : gap;

  return (
    <div className={`elb-explorer ${className}`}>
      <div
        className="elb-explorer-grid"
        style={{
          gridTemplateColumns,
          gap: gridGap,
        }}
      >
        {children}
      </div>
    </div>
  );
}
