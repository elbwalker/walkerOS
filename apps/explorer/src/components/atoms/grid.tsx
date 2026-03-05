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
  columns?: number;
  minBoxWidth?: number | string;
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
 * scrolling when content exceeds available space. Boxes maintain minimum
 * width and never wrap to new rows.
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
  const gridStyle: React.CSSProperties = {};

  // Row height modifiers
  if (rowHeight === 'auto') {
    classNames.push('elb-explorer-grid--row-auto');
  } else if (rowHeight === 'equal') {
    classNames.push('elb-explorer-grid--row-equal');
  } else if (rowHeight === 'synced') {
    classNames.push('elb-explorer-grid--row-synced');
  } else if (typeof rowHeight === 'number') {
    // Apply custom row height via CSS variable
    (gridStyle as Record<string, string>)['--grid-row-min-height'] =
      `${rowHeight}px`;
    (gridStyle as Record<string, string>)['--grid-row-max-height'] =
      `${rowHeight}px`;
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
    (gridStyle as Record<string, string>)['--grid-min-box-width'] =
      typeof minBoxWidth === 'number' ? `${minBoxWidth}px` : minBoxWidth;
  }

  if (maxRowHeight !== undefined) {
    // Warn about dangerous configuration that can cause infinite growth
    (gridStyle as Record<string, string>)['--grid-row-max-height'] =
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
            ‹
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
            ›
          </button>
        )}
      </div>
    </GridHeightContext.Provider>
  );
}
