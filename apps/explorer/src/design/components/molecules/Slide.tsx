import React, { type HTMLAttributes, type ReactNode } from 'react';
import { Text } from '../atoms/Text';
import { cx } from '../cx';
import { SectionHeading } from './SectionHeading';

export interface SlideProps extends HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  headline: string;
  /** Text as a paragraph, or the caller's own blocks (a CheckList). */
  body?: ReactNode;
  /** A part or a screen beside the text, in a second column. */
  visual?: ReactNode;
}

/** One slide of a carousel or a document post: a headline, its body, and an optional visual beside them, centred in the frame it fills. */
export function Slide({
  eyebrow,
  headline,
  body,
  visual,
  className,
  ...rest
}: SlideProps) {
  const copy = (
    <div className="elb-slide__copy">
      <SectionHeading eyebrow={eyebrow} title={headline} />
      {body !== undefined && body !== null && (
        <div className="elb-slide__body">
          {typeof body === 'string' ? <Text size="lg">{body}</Text> : body}
        </div>
      )}
    </div>
  );
  const hasVisual = visual !== undefined && visual !== null;
  return (
    <div
      {...rest}
      className={cx(
        'elb-full-frame',
        'elb-slide',
        hasVisual && 'elb-slide--visual',
        className,
      )}
    >
      {copy}
      {hasVisual && <div className="elb-slide__visual">{visual}</div>}
    </div>
  );
}
