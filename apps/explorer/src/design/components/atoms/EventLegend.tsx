import React, { type HTMLAttributes } from 'react';
import { cx } from '../cx';

export interface EventLegendProps extends HTMLAttributes<HTMLDivElement> {
  parts?: Array<'entity' | 'action' | 'property' | 'context' | 'globals'>;
}

type EventPart = NonNullable<EventLegendProps['parts']>[number];

// The five parts of a walkerOS event, in event order, with their colours.
const PARTS: ReadonlyArray<readonly [EventPart, string]> = [
  ['entity', 'var(--event-entity)'],
  ['action', 'var(--event-action)'],
  ['property', 'var(--event-property)'],
  ['context', 'var(--event-context)'],
  ['globals', 'var(--event-globals)'],
];

/**
 * The fixed colour key for the five parts of a walkerOS event. Event colours
 * only show on dark grounds, so the legend is a dark island in both themes.
 * `parts` shows a subset, still in event order.
 */
export function EventLegend({ parts, className, ...rest }: EventLegendProps) {
  return (
    <div {...rest} className={cx('elb-legend', className)} data-theme="dark">
      {PARTS.filter(([part]) => !parts || parts.includes(part)).map(
        ([part, color]) => (
          <span key={part} className="elb-legend__item">
            <i
              className="elb-legend__swatch"
              style={{ background: color }}
              aria-hidden="true"
            />
            {part}
          </span>
        ),
      )}
    </div>
  );
}
