import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Eyebrow } from '../atoms/Eyebrow';
import type { CallToAction, LinkComponent } from '../types';

export interface HighlightCardProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'title'
> {
  label: string;
  title: ReactNode;
  children: ReactNode;
  cta: CallToAction;
  linkComponent?: LinkComponent;
}

/** A large card with a corner glow and a secondary CTA: a direction to explore. */
export function HighlightCard({
  label,
  title,
  children,
  cta,
  linkComponent,
  className,
  ...rest
}: HighlightCardProps) {
  return (
    <Card
      {...rest}
      padding="lg"
      radius="xl"
      hover
      glow
      className={cx('elb-highlight-card', className)}
    >
      <Eyebrow variant="label">{label}</Eyebrow>
      <h3 className="elb-highlight-card__title">{title}</h3>
      <p className="elb-highlight-card__text">{children}</p>
      <Button
        {...cta.attributes}
        href={cta.href}
        variant="secondary"
        arrow
        linkComponent={linkComponent}
        className="elb-highlight-card__cta"
      >
        {cta.label}
      </Button>
    </Card>
  );
}
