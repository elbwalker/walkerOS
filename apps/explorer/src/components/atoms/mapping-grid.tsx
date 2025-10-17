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
  // Convert layout shortcuts to grid template columns
  const getGridTemplateColumns = () => {
    switch (layout) {
      case 'row':
        return 'auto'; // Auto-fit columns in a row
      case 'cols-2':
        return 'repeat(2, 1fr)';
      default:
        return layout; // Custom value (e.g., "1fr 2fr")
    }
  };

  const gridTemplateColumns = getGridTemplateColumns();
  const gridGap = typeof gap === 'number' ? `${gap}px` : gap;

  const responsiveClass = responsive ? 'elb-mapping-grid-responsive' : '';

  return (
    <div
      className={`elb-mapping-grid ${responsiveClass} ${className}`.trim()}
      style={{
        display: 'grid',
        gridTemplateColumns,
        gap: gridGap,
        alignItems: 'center',
      }}
    >
      {children}
    </div>
  );
}
