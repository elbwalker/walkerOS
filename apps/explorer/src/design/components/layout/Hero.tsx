import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';
import { SectionHeading } from '../molecules/SectionHeading';

export interface HeroProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  eyebrow: ReactNode;
  title: ReactNode;
  /** A phrase after the title in primary. */
  highlight?: ReactNode;
  lead: ReactNode;
  /** The call-to-action row. */
  actions: ReactNode;
  /** A short proof line below the actions. */
  proof?: ReactNode;
  /** The demo below, left-aligned. */
  children?: ReactNode;
}

/** The page's opening band: centred heading, actions, proof and a demo, on a glow. */
export function Hero({
  eyebrow,
  title,
  highlight,
  lead,
  actions,
  proof,
  children,
  className,
  ...rest
}: HeroProps) {
  return (
    <section {...rest} className={cx('elb-hero', className)}>
      <div className="elb-hero__inner">
        <SectionHeading
          level={1}
          eyebrow={eyebrow}
          title={title}
          highlight={highlight}
          lead={lead}
        />
        <div className="elb-hero__actions">{actions}</div>
        {proof !== undefined && <div className="elb-hero__proof">{proof}</div>}
        {children !== undefined && (
          <div className="elb-hero__demo">{children}</div>
        )}
      </div>
    </section>
  );
}
