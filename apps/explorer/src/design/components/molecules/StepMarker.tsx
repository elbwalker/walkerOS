import React, { type HTMLAttributes } from 'react';
import { Eyebrow } from '../atoms/Eyebrow';
import { StepNumber } from '../atoms/StepNumber';
import { cx } from '../cx';

/** Where a step happens: the page, a code file, the CLI, an MCP call or the app. */
export type StepSurface = 'page' | 'code' | 'cli' | 'mcp' | 'app';

export interface StepMarkerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'title'
> {
  n: number;
  surface: StepSurface;
  title: string;
}

const SURFACE_WORDS: Readonly<Record<StepSurface, string>> = {
  page: 'Page',
  code: 'Code',
  cli: 'CLI',
  mcp: 'MCP',
  app: 'App',
};

/** A chapter of a walk-through: the step's number, where it happens, and its title. */
export function StepMarker({
  n,
  surface,
  title,
  className,
  ...rest
}: StepMarkerProps) {
  return (
    <div {...rest} className={cx('elb-step-marker', className)}>
      <StepNumber n={n} />
      <div className="elb-step-marker__text">
        <Eyebrow
          variant="label"
          tone="muted"
          className="elb-step-marker__surface"
        >
          {SURFACE_WORDS[surface]}
        </Eyebrow>
        <h2 className="elb-step-marker__title">{title}</h2>
      </div>
    </div>
  );
}
