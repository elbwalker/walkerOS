import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Eyebrow } from '../atoms/Eyebrow';
import type { CallToAction, LinkComponent } from '../types';
import { CheckList } from './CheckList';

export interface PlanCardProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'title'
> {
  label: string;
  title: ReactNode;
  children: ReactNode;
  features?: ReactNode[];
  cta?: CallToAction;
  /** The one recommended plan: primary CTA, ring, link-coloured label. */
  highlight?: boolean;
  linkComponent?: LinkComponent;
}

/** A service tier: label, name, description, checked features and a CTA. */
export function PlanCard({
  label,
  title,
  children,
  features,
  cta,
  highlight = false,
  linkComponent,
  className,
  ...rest
}: PlanCardProps) {
  return (
    <Card
      {...rest}
      padding="md"
      highlight={highlight}
      className={cx('elb-plan', className)}
    >
      <Eyebrow variant="label" tone={highlight ? 'link' : 'muted'}>
        {label}
      </Eyebrow>
      <h3 className="elb-plan__title">{title}</h3>
      <p className="elb-plan__text">{children}</p>
      {features && <CheckList items={features} layout="stack" />}
      {cta && (
        <Button
          {...cta.attributes}
          href={cta.href}
          variant={highlight ? 'primary' : 'secondary'}
          block
          linkComponent={linkComponent}
        >
          {cta.label}
        </Button>
      )}
    </Card>
  );
}
