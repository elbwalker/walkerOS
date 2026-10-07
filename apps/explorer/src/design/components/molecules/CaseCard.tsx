import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';
import { Card } from '../atoms/Card';
import { Eyebrow } from '../atoms/Eyebrow';
import { Stat } from '../atoms/Stat';

export interface CaseStat {
  value: ReactNode;
  label: ReactNode;
}

export interface CaseCardProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'title'
> {
  label: string;
  title: ReactNode;
  children: ReactNode;
  stats: CaseStat[];
}

/** A customer story: label, headline, text and a row of stat tiles. */
export function CaseCard({
  label,
  title,
  children,
  stats,
  className,
  ...rest
}: CaseCardProps) {
  return (
    <Card {...rest} padding="md" className={cx('elb-case-card', className)}>
      <Eyebrow variant="label">{label}</Eyebrow>
      <h3 className="elb-case-card__title">{title}</h3>
      <p className="elb-case-card__text">{children}</p>
      <div className="elb-case-card__stats">
        {stats.map((stat, index) => (
          <Stat key={index} value={stat.value}>
            {stat.label}
          </Stat>
        ))}
      </div>
    </Card>
  );
}
