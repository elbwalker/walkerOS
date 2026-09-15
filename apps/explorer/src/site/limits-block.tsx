import React from 'react';

export interface LimitsBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  /** What the thing does not do. One limit per entry. */
  items: React.ReactNode[];
  /**
   * Heading above the list. Named `heading` rather than `title` so the HTML
   * title attribute stays available to consumers.
   */
  heading?: React.ReactNode;
  className?: string;
}

/**
 * LimitsBlock - what a thing does not do.
 *
 * Stating limits plainly beside the claims is what the component is for, so
 * leaving it off a page is a deliberate act rather than the default one.
 */
export function LimitsBlock({
  items,
  heading = 'What this does not do',
  className = '',
  ...rest
}: LimitsBlockProps) {
  return (
    <div className={`elb-oa-limits ${className}`.trim()} {...rest}>
      <h3 className="elb-oa-limits__title">{heading}</h3>
      <ul className="elb-oa-limits__list">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
