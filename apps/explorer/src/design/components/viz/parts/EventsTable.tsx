import React, { Fragment } from 'react';
import { vizStyle } from './style';
import { clamp, ease } from './timeline';

export interface EventsTableRow {
  readonly key: string;
  readonly name: string;
  readonly data: Readonly<Record<string, string>>;
  /** Milliseconds since the row arrived; drives its tint, fade and slide. */
  readonly age: number;
}

const SKELETON_ROWS = 6;

/** The hero's live `SELECT * FROM walkerOS.events` table. */
export function EventsTable({ rows }: { rows: readonly EventsTableRow[] }) {
  const skeletons = Math.max(0, SKELETON_ROWS - rows.length);
  return (
    <div className="elb-viz-table">
      <div className="elb-viz-table__head">
        <span className="elb-viz-table__query">
          <span className="elb-viz-table__keyword">SELECT</span> *{' '}
          <span className="elb-viz-table__keyword">FROM</span>{' '}
          <span className="elb-viz-table__source">walkerOS.events</span>
        </span>
        <span className="elb-viz-table__live">
          <span className="elb-viz-table__dot" aria-hidden="true" />
          live
        </span>
      </div>
      <div className="elb-viz-table__body">
        <div className="elb-viz-table__scroll">
          <div className="elb-viz-table__rows">
            <div className="elb-viz-table__row elb-viz-table__row--header">
              <span className="elb-viz-table__cell elb-viz-table__cell--n">
                Row
              </span>
              <span className="elb-viz-table__cell">
                name<span className="elb-viz-table__type">STRING</span>
              </span>
              <span className="elb-viz-table__cell">
                data<span className="elb-viz-table__type">JSON</span>
              </span>
            </div>
            {rows.map((row, index) => (
              <div
                key={row.key}
                className="elb-viz-table__row elb-viz-table__row--event"
                style={vizStyle({
                  '--elb-viz-row-tint': 14 * (1 - clamp(row.age / 1600)),
                  '--elb-viz-row-opacity': clamp(row.age / 300),
                  '--elb-viz-row-shift': (1 - ease(clamp(row.age / 500))) * -80,
                })}
              >
                <span className="elb-viz-table__cell elb-viz-table__cell--n">
                  {index + 1}
                </span>
                <span className="elb-viz-table__cell">{row.name}</span>
                <span className="elb-viz-table__cell elb-viz-table__json">
                  {'{'}
                  {Object.entries(row.data).map(([key, value], position) => (
                    <Fragment key={key}>
                      {position === 0 ? '"' : ',"'}
                      <span className="elb-viz-table__json-key">{key}</span>
                      {'":"'}
                      <span className="elb-viz-table__json-value">{value}</span>
                      {'"'}
                    </Fragment>
                  ))}
                  {'}'}
                </span>
              </div>
            ))}
            {Array.from({ length: skeletons }, (_, index) => (
              <div
                key={`skeleton-${index}`}
                className="elb-viz-table__row elb-viz-table__row--skeleton"
                aria-hidden="true"
              >
                <span className="elb-viz-table__cell elb-viz-table__cell--n">
                  {rows.length + index + 1}
                </span>
                <span className="elb-viz-table__cell">
                  <span className="elb-viz-table__bar" />
                </span>
                <span className="elb-viz-table__cell">
                  <span className="elb-viz-table__bar" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
