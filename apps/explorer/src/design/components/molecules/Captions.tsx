import React, { Fragment, type HTMLAttributes } from 'react';
import { cx } from '../cx';

export interface CaptionsProps extends HTMLAttributes<HTMLDivElement> {
  /** The lines on screen. Two show at most; the caller pages longer text. */
  lines: readonly string[];
  /** The current word, by line and word, both counted from 0. */
  highlight?: { line: number; word: number };
}

const MAX_LINES = 2;
const SPACE = /(\s+)/;

/** A line's words, the `current` one marked by weight and underline, not by colour alone. */
function Words({ line, current }: { line: string; current: number }) {
  let word = -1;
  return (
    <>
      {line.split(SPACE).map((part, index) => {
        if (part.trim() === '') return part;
        word += 1;
        return word === current ? (
          <span
            key={index}
            className="elb-captions__word--current"
            aria-current="true"
          >
            {part}
          </span>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        );
      })}
    </>
  );
}

/** Burned-in captions: up to two lines on a surface box. */
export function Captions({
  lines,
  highlight,
  className,
  ...rest
}: CaptionsProps) {
  return (
    <div {...rest} className={cx('elb-captions', className)}>
      {lines.slice(0, MAX_LINES).map((line, index) => (
        <p key={index} className="elb-captions__line">
          {highlight?.line === index ? (
            <Words line={line} current={highlight.word} />
          ) : (
            line
          )}
        </p>
      ))}
    </div>
  );
}
