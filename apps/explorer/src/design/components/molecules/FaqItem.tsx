import React, {
  Fragment,
  type DetailsHTMLAttributes,
  type ReactNode,
} from 'react';
import { cx } from '../cx';

export interface FaqItemProps extends Omit<
  DetailsHTMLAttributes<HTMLDetailsElement>,
  'children'
> {
  question: ReactNode;
  /** The answer; an array renders one block per entry, strings as paragraphs. */
  children: ReactNode;
}

/** One FAQ question as a native disclosure; `open` sets the initial state. */
export function FaqItem({
  question,
  children,
  className,
  ...rest
}: FaqItemProps) {
  const parts = Array.isArray(children) ? children : [children];
  return (
    <details {...rest} className={cx('elb-faq', className)}>
      <summary className="elb-faq__question">{question}</summary>
      <div className="elb-faq__answer">
        {parts.map((part, index) =>
          typeof part === 'string' ? (
            <p key={index}>{part}</p>
          ) : (
            <Fragment key={index}>{part}</Fragment>
          ),
        )}
      </div>
    </details>
  );
}
