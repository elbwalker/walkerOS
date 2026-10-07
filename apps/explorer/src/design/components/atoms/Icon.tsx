import React, { type SVGAttributes } from 'react';
import { cx } from '../cx';

export interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, 'name'> {
  name: 'check' | 'copy';
  size?: number;
}

/** The design system's line glyphs, drawn in currentColor; a check is always primary. */
export function Icon({ name, size = 16, className, ...rest }: IconProps) {
  // Decorative unless the caller labels it (`aria-hidden={false}`, `aria-label`).
  const svg = {
    'aria-hidden': true,
    focusable: false,
    ...rest,
    width: size,
    height: size,
    className: cx('elb-icon', `elb-icon--${name}`, className),
  };
  return name === 'check' ? (
    <svg {...svg} viewBox="0 0 16 16">
      <path
        d="M3 8.5l3 3 7-7"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg {...svg} viewBox="0 0 24 24">
      <rect
        x={9}
        y={9}
        width={12}
        height={12}
        rx={2}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      />
      <path
        d="M5 15V5a2 2 0 0 1 2-2h10"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      />
    </svg>
  );
}
