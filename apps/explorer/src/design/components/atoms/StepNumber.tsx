import React, { type HTMLAttributes } from 'react';
import { cx } from '../cx';

export interface StepNumberProps extends HTMLAttributes<HTMLSpanElement> {
  n: number;
}

/** A step's number in a ring: the quickstart's steps and a step marker. */
export function StepNumber({ n, className, ...rest }: StepNumberProps) {
  return (
    <span {...rest} className={cx('elb-step-number', className)}>
      {n}
    </span>
  );
}
