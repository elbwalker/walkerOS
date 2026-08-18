import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * Badge - pill label for story headers, promos and section eyebrows.
 *
 * Open Air site component. Rest props spread onto the root so consumers can
 * attach data-elb* tagging attributes.
 */
export function Badge({ children, className = '', ...rest }: BadgeProps) {
  return (
    <span className={`elb-oa-badge ${className}`.trim()} {...rest}>
      {children}
    </span>
  );
}
