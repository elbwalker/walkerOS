import React from 'react';
import { formatOut, type Flow } from '@walkeros/core';
import { CodeView } from './code-view';

export interface StepExampleProps {
  example: Flow.StepExample;
  className?: string;
}

/**
 * StepExample - A step example's Event, Mapping and Out, read-only.
 *
 * The boxes sit side by side while each keeps a readable width and wrap to
 * fewer per row, down to a stack, as the container narrows. A row is as tall
 * as its tallest box up to a cap; longer code scrolls inside its box.
 *
 * Rendered with the static Shiki path, so the code is in server-rendered HTML
 * and in the docs Markdown export. That export relies on this DOM: one
 * labelled box per part, each with a single `pre > code`, in Event, [Mapping],
 * Out order.
 *
 * @example
 * <StepExample example={data.examples.step.addToCart} />
 */
export function StepExample({ example, className }: StepExampleProps) {
  const rootClassName =
    `elb-explorer elb-step-example ${className || ''}`.trim();

  return (
    <div className={rootClassName}>
      {example.description && (
        <p className="elb-step-example-description">{example.description}</p>
      )}
      <div className="elb-step-example-boxes">
        <CodeView
          label="Event"
          code={JSON.stringify(example.in, null, 2)}
          language="json"
        />
        {example.mapping !== undefined && (
          <CodeView
            label="Mapping"
            code={JSON.stringify(example.mapping, null, 2)}
            language="json"
          />
        )}
        <CodeView
          label="Out"
          code={formatOut(example.out ?? [])}
          language="javascript"
        />
      </div>
    </div>
  );
}
