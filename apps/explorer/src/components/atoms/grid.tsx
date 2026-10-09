import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  GridHeightContext,
  type GridHeightContextValue,
} from '../../contexts/GridHeightContext';

export interface GridProps {
  children: React.ReactNode;
  /**
   * Boxes per row; further boxes wrap to a new row. Pass the number of boxes
   * you render, since unused columns stay empty. Omit for one row of all boxes.
   */
  columns?: number;
  minBoxWidth?: number | string;
  /**
   * Fixed box width in px: one row at every container width, scrolled
   * sideways and snapping to each box. A box never grows past the row, so a
   * narrow container still shows the edge of the next one. Overrides
   * `columns` and `minBoxWidth`.
   */
  boxWidth?: number;
  gap?: number | string;
  rowHeight?: 'auto' | 'equal' | 'synced' | number;
  maxRowHeight?: number | string | 'none';
  showScrollButtons?: boolean;
  className?: string;
}

/**
 * Grid - Horizontal scrolling layout component for arranging boxes
 *
 * Provides consistent grid layout for box components with horizontal
 * scrolling when content exceeds available space. Boxes keep a minimum width.
 * By default all boxes share one row; `columns` sets the boxes per row and
 * wraps the rest. Narrow containers stack the boxes. `boxWidth` keeps one
 * row of fixed-width boxes at every width instead.
 *
 * @example
 * // 5 boxes with default 350px minimum width
 * <Grid columns={5}>
 *   <CodeBox ... />
 *   <CodeBox ... />
 *   <CodeBox ... />
 *   <CodeBox ... />
 *   <CodeBox ... />
 * </Grid>
 *
 * @example
 * // Custom minimum box width
 * <Grid columns={3} minBoxWidth={400}>
 *   <BrowserBox ... />
 *   <CodeBox ... />
 *   <CodeBox ... />
 * </Grid>
 *
 * @example
 * // One row of 350px boxes, scrolled sideways on any screen
 * <Grid boxWidth={350}>
 *   <Preview ... />
 *   <CodeBox ... />
 *   <CodeBox ... />
 *   <CodeBox ... />
 * </Grid>
 *
 * @example
 * // Custom row height
 * <Grid columns={2} rowHeight={300}>
 *   <CodeBox ... />
 *   <CodeBox ... />
 * </Grid>
 *
 * @example
 * // Auto row height (no minimum)
 * <Grid columns={3} rowHeight="auto">
 *   <CodeBox ... />
 * </Grid>
 *
 * @example
 * // Unlimited row height (no max constraint)
 * <Grid columns={2} maxRowHeight="none">
 *   <PropertyTable ... />
 *   <CodeBox ... />
 * </Grid>
 *
 * @example
 * // Custom max row height
 * <Grid columns={2} maxRowHeight={800}>
 *   <PropertyTable ... />
 *   <CodeBox ... />
 * </Grid>
 */
export function Grid({
  children,
  columns,
  minBoxWidth,
  boxWidth,
  gap,
  rowHeight = 'equal',
  maxRowHeight,
  showScrollButtons = true,
  className = '',
}: GridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const [boxHeights, setBoxHeights] = useState<Map<number, number>>(new Map());
  const boxIdCounter = useRef(0);

  const getBoxId = useCallback(() => boxIdCounter.current++, []);

  const registerBox = useCallback((id: number, height: number) => {
    setBoxHeights((prev) => {
      const next = new Map(prev);
      next.set(id, height);
      return next;
    });
  }, []);

  const unregisterBox = useCallback((id: number) => {
    setBoxHeights((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const syncedHeight = useMemo(() => {
    if (rowHeight !== 'synced' || boxHeights.size === 0) return null;
    return Math.min(600, Math.max(...Array.from(boxHeights.values())));
  }, [boxHeights, rowHeight]);

  const contextValue: GridHeightContextValue = useMemo(
    () => ({
      registerBox,
      unregisterBox,
      getBoxId,
      syncedHeight,
      enabled: rowHeight === 'synced',
    }),
    [registerBox, unregisterBox, getBoxId, syncedHeight, rowHeight],
  );

  const classNames = ['elb-explorer-grid'];
  const gridStyle: React.CSSProperties & Record<`--${string}`, string> = {};

  // Row height modifiers
  if (rowHeight === 'auto') {
    classNames.push('elb-explorer-grid--row-auto');
  } else if (rowHeight === 'equal') {
    classNames.push('elb-explorer-grid--row-equal');
  } else if (rowHeight === 'synced') {
    classNames.push('elb-explorer-grid--row-synced');
  } else if (typeof rowHeight === 'number') {
    // Apply custom row height via CSS variable
    gridStyle['--grid-row-min-height'] = `${rowHeight}px`;
    gridStyle['--grid-row-max-height'] = `${rowHeight}px`;
  }

  // `columns` boxes per row, the rest wrap. Set from the prop, not by counting
  // React children: a Fragment or a wrapper component counts as one child.
  if (boxWidth !== undefined) {
    classNames.push('elb-explorer-grid--fixed');
    gridStyle['--grid-box-width'] = `${boxWidth}px`;
  } else if (columns !== undefined && columns >= 1) {
    classNames.push('elb-explorer-grid--columns');
    gridStyle['--grid-columns'] = String(Math.floor(columns));
  }

  // Add custom className
  if (className) {
    classNames.push(className);
  }

  // Apply custom gap if provided
  if (gap !== undefined) {
    gridStyle.gap = typeof gap === 'number' ? `${gap}px` : gap;
  }

  // Apply custom minimum box width if provided
  if (minBoxWidth !== undefined) {
    gridStyle['--grid-min-box-width'] =
      typeof minBoxWidth === 'number' ? `${minBoxWidth}px` : minBoxWidth;
  }

  if (maxRowHeight !== undefined) {
    // Warn about dangerous configuration that can cause infinite growth
    gridStyle['--grid-row-max-height'] =
      maxRowHeight === 'none'
        ? 'none'
        : typeof maxRowHeight === 'number'
          ? `${maxRowHeight}px`
          : maxRowHeight;
  }

  // Check scroll state
  const updateScrollState = useCallback(() => {
    const el = gridRef.current;
    if (!el) return;

    const hasOverflow = el.scrollWidth > el.clientWidth;
    const isAtStart = el.scrollLeft <= 1;
    const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;

    setCanScrollLeft(hasOverflow && !isAtStart);
    setCanScrollRight(hasOverflow && !isAtEnd);
  }, []);

  // Scroll handlers
  const scrollLeft = () => {
    if (!gridRef.current) return;
    const scrollAmount = gridRef.current.clientWidth * 0.8;
    gridRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  };

  const scrollRight = () => {
    if (!gridRef.current) return;
    const scrollAmount = gridRef.current.clientWidth * 0.8;
    gridRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  // Update scroll state on mount, scroll, and resize
  useEffect(() => {
    const el = gridRef.current;
    if (!el || !showScrollButtons) return;

    updateScrollState();

    el.addEventListener('scroll', updateScrollState);
    window.addEventListener('resize', updateScrollState);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, showScrollButtons]);

  return (
    <GridHeightContext.Provider value={contextValue}>
      <div className="elb-explorer elb-explorer-grid-wrapper">
        {showScrollButtons && canScrollLeft && (
          <button
            className="elb-explorer-grid-scroll-button elb-explorer-grid-scroll-button--left"
            onClick={scrollLeft}
            aria-label="Scroll left"
            type="button"
          >
            <Chevron direction="left" />
          </button>
        )}

        <div ref={gridRef} className={classNames.join(' ')} style={gridStyle}>
          {children}
        </div>

        {showScrollButtons && canScrollRight && (
          <button
            className="elb-explorer-grid-scroll-button elb-explorer-grid-scroll-button--right"
            onClick={scrollRight}
            aria-label="Scroll right"
            type="button"
          >
            <Chevron direction="right" />
          </button>
        )}
      </div>
    </GridHeightContext.Provider>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline
        points={direction === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'}
      />
    </svg>
  );
}
