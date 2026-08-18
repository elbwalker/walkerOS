import React from 'react';

export interface SectionHeadProps extends React.HTMLAttributes<HTMLDivElement> {
  headline: React.ReactNode;
  /** Uppercase label above the headline. */
  kicker?: React.ReactNode;
  sub?: React.ReactNode;
  /** Heading level, so pages keep a correct document outline. */
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}

/**
 * SectionHead - the kicker / headline / sub trio that opens every section.
 *
 * `as` exists because the same visual treatment appears at different depths;
 * choosing the tag by meaning rather than by size keeps the outline honest.
 */
export function SectionHead({
  headline,
  kicker,
  sub,
  as: Heading = 'h2',
  className = '',
  ...rest
}: SectionHeadProps) {
  return (
    <div className={`elb-oa-section-head ${className}`.trim()} {...rest}>
      {kicker ? <p className="elb-oa-section-head__kicker">{kicker}</p> : null}
      <Heading className="elb-oa-section-head__headline">{headline}</Heading>
      {sub ? <p className="elb-oa-section-head__sub">{sub}</p> : null}
    </div>
  );
}
