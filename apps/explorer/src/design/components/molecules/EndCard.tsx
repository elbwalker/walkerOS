import React, { type HTMLAttributes, type ReactNode } from 'react';
import { InstallCommand } from '../atoms/InstallCommand';
import { TextLink } from '../atoms/TextLink';
import { cx } from '../cx';
import { SectionHeading } from './SectionHeading';

export interface EndCardProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'title'
> {
  title: string;
  /** Where to try it: shown without its scheme, linked as given. */
  url: string;
  /** A command to copy, below the link. */
  command?: string;
  /** The brand mark above the heading, rendered by the caller. */
  logo?: ReactNode;
}

const SCHEME = /^https?:\/\//;

/** The closing card of a video or a post: where to try it yourself, centred in the frame it fills. */
export function EndCard({
  title,
  url,
  command,
  logo,
  className,
  ...rest
}: EndCardProps) {
  return (
    <div {...rest} className={cx('elb-full-frame', 'elb-end-card', className)}>
      {logo !== undefined && logo !== null && (
        <div className="elb-end-card__logo">{logo}</div>
      )}
      <SectionHeading title={title} align="center" />
      <TextLink href={url} className="elb-end-card__url">
        {url.replace(SCHEME, '')}
      </TextLink>
      {command !== undefined && <InstallCommand command={command} />}
    </div>
  );
}
