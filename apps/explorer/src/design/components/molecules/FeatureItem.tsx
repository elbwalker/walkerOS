import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';
import { Icon } from '../atoms/Icon';
import { TextLink } from '../atoms/TextLink';
import type { DataAttributes, LinkComponent } from '../types';

export interface FeatureItemProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'title'
> {
  title: ReactNode;
  children: ReactNode;
  href?: string;
  linkLabel?: string;
  /** A router link rendered instead of `<a>`. */
  linkComponent?: LinkComponent;
  /** Tagging for the link alone (the root takes the item's own). */
  linkAttributes?: DataAttributes;
}

/** A checked feature with a title, one sentence and a docs link. */
export function FeatureItem({
  title,
  children,
  href,
  linkLabel = 'Docs',
  linkComponent,
  linkAttributes,
  className,
  ...rest
}: FeatureItemProps) {
  return (
    <div {...rest} className={cx('elb-feature', className)}>
      <Icon name="check" size={20} />
      <div>
        <h3 className="elb-feature__title">{title}</h3>
        <p className="elb-feature__text">{children}</p>
        {href !== undefined && (
          <TextLink
            {...linkAttributes}
            href={href}
            arrow
            linkComponent={linkComponent}
            className="elb-feature__link"
          >
            {linkLabel}
          </TextLink>
        )}
      </div>
    </div>
  );
}
