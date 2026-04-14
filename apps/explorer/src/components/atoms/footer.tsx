import React from 'react';

export interface FooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Footer - Footer atom component for boxes
 *
 * Provides a fixed-height footer area at the bottom of a box.
 * Pairs with Header component for consistent box structure.
 *
 * @example
 * <Box header="Preview">
 *   <Preview ... />
 *   <Footer>
 *     <ButtonGroup buttons={...} />
 *   </Footer>
 * </Box>
 */
export function Footer({ children, className = '' }: FooterProps) {
  return <div className={`elb-explorer-footer ${className}`}>{children}</div>;
}
