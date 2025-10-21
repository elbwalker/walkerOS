import React from 'react';

export interface MappingGridProps {
  children: React.ReactNode;
  layout?: 'row' | 'cols-2' | string;
  gap?: number | string;
  responsive?: boolean;
  className?: string;
}

/**
 * MappingGrid - Enhanced grid layout component for form fields
 *
 * Provides flexible grid layouts for mapping form components with responsive
 * support. Designed for form field arrangements like [Label, Input] pairs,
 * [AutoSelect, Button] combinations, and multi-column layouts.
 *
 * @example
 * // Two column layout
 * <MappingGrid layout="cols-2">
 *   <label>Name</label>
 *   <input />
 * </MappingGrid>
 *
 * @example
 * // Single row with auto-fit columns
 * <MappingGrid layout="row">
 *   <AutoSelect />
 *   <IconButton />
 * </MappingGrid>
 *
 * @example
 * // Custom grid template
 * <MappingGrid layout="1fr 2fr">
 *   <label>Field</label>
 *   <input />
 * </MappingGrid>
 *
 * @example
 * // Responsive: 1 col on mobile, 2 cols on tablet+
 * <MappingGrid layout="cols-2" responsive>
 *   <field1 />
 *   <field2 />
 * </MappingGrid>
 */
export function MappingGrid({
  children,
  layout = 'row',
  gap = 12,
  responsive = true,
  className = '',
}: MappingGridProps) {
  // Convert layout shortcuts to CSS classes
  const getLayoutClass = () => {
    switch (layout) {
      case 'row':
        return 'elb-mapping-grid-row';
      case 'cols-2':
        return 'elb-mapping-grid-cols-2';
      default:
        // For custom grid-template-columns, use inline style as fallback
        return '';
    }
  };

  // Convert gap to CSS class
  const getGapClass = () => {
    const gapNum = typeof gap === 'number' ? gap : parseInt(gap, 10);
    if ([8, 12, 16, 20].includes(gapNum)) {
      return `elb-mapping-grid-gap-${gapNum}`;
    }
    return ''; // Fallback to inline style for custom gaps
  };

  const layoutClass = getLayoutClass();
  const gapClass = getGapClass();
  const responsiveClass = responsive ? 'elb-mapping-grid-responsive' : '';

  // Build class list
  const classes = [
    'elb-mapping-grid',
    layoutClass,
    gapClass,
    responsiveClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Only use inline styles for custom layouts/gaps not covered by CSS classes
  const needsCustomLayout = !layoutClass && layout !== 'row';
  const needsCustomGap = !gapClass;

  const inlineStyle: React.CSSProperties = {};
  if (needsCustomLayout) {
    inlineStyle.gridTemplateColumns = layout;
  }
  if (needsCustomGap) {
    inlineStyle.gap = typeof gap === 'number' ? `${gap}px` : gap;
  }

  return (
    <div
      className={classes}
      style={Object.keys(inlineStyle).length > 0 ? inlineStyle : undefined}
    >
      {children}
    </div>
  );
}
