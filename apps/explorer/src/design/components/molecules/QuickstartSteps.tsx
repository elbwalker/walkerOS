import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';

export interface QuickstartStep {
  title: string;
  text: string;
}

export interface QuickstartStepsProps extends HTMLAttributes<HTMLDivElement> {
  steps: ReadonlyArray<QuickstartStep>;
  /** After the steps, aligned to their start: the link to the full guide. */
  children?: ReactNode;
}

/** Hand-drawn arrows between the steps, in turn: a wave, then a loop. */
const ARROWS = [
  {
    kind: 'wave',
    paths: [
      'M4 26 C 18 6, 34 6, 40 20 S 58 34, 70 16',
      'M62 20 L70 16 L69.5 25',
    ],
  },
  {
    kind: 'loop',
    paths: [
      'M4 28 C 20 30, 26 8, 38 10 C 50 12, 44 28, 36 24 C 28 20, 44 6, 72 14',
      'M65.7 7.6 L72 14 L63.3 16.2',
    ],
  },
];

function Arrow({ kind, paths }: (typeof ARROWS)[number]) {
  return (
    <li
      className={cx('elb-quickstart__arrow', `elb-quickstart__arrow--${kind}`)}
      aria-hidden="true"
    >
      <svg
        width="76"
        height="40"
        viewBox="0 0 76 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </li>
  );
}

/**
 * Numbered steps in a row joined by hand-drawn arrows, a column on narrow
 * screens; the children follow below.
 */
export function QuickstartSteps({
  steps,
  children,
  className,
  ...rest
}: QuickstartStepsProps) {
  return (
    <div {...rest} className={cx('elb-quickstart', className)}>
      <ol className="elb-quickstart__steps">
        {steps.flatMap((step, index) => {
          const item = (
            <li key={step.title} className="elb-quickstart__step">
              <div className="elb-quickstart__head">
                <span className="elb-quickstart__num" aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className="elb-quickstart__title">{step.title}</h3>
              </div>
              <p className="elb-quickstart__copy">{step.text}</p>
            </li>
          );
          return index < steps.length - 1
            ? [
                item,
                <Arrow
                  key={`arrow-${index}`}
                  {...ARROWS[index % ARROWS.length]}
                />,
              ]
            : [item];
        })}
      </ol>
      {children}
    </div>
  );
}
