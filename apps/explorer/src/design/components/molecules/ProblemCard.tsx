import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';
import { Card } from '../atoms/Card';

export interface ProblemCardProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'title'
> {
  number: string;
  title: ReactNode;
  children: ReactNode;
}

/** A numbered card naming one problem. */
export function ProblemCard({
  number,
  title,
  children,
  className,
  ...rest
}: ProblemCardProps) {
  return (
    <Card
      {...rest}
      padding="sm"
      hover
      className={cx('elb-problem-card', className)}
    >
      <h3 className="elb-problem-card__title">
        <span className="elb-problem-card__number">{number}</span>
        {title}
      </h3>
      <p className="elb-problem-card__text">{children}</p>
    </Card>
  );
}
