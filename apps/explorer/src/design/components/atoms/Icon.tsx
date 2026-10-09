import React, { type ReactElement, type SVGAttributes } from 'react';
import { cx } from '../cx';

export type IconName =
  | 'check'
  | 'copy'
  | 'lock'
  | 'reload'
  | 'bookmark'
  | 'warning';

export interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

/** Each glyph's grid and strokes, drawn in currentColor. */
const GLYPHS: Readonly<
  Record<IconName, { viewBox: string; strokes: ReactElement }>
> = {
  check: {
    viewBox: '0 0 16 16',
    strokes: (
      <path
        d="M3 8.5l3 3 7-7"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  copy: {
    viewBox: '0 0 24 24',
    strokes: (
      <>
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
      </>
    ),
  },
  lock: {
    viewBox: '0 0 24 24',
    strokes: (
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x={5} y={11} width={14} height={10} rx={2} />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </g>
    ),
  },
  reload: {
    viewBox: '0 0 24 24',
    strokes: (
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 4v6h-6" />
        <path d="M20.5 15a9 9 0 1 1-2.1-9.4L21 10" />
      </g>
    ),
  },
  bookmark: {
    viewBox: '0 0 24 24',
    strokes: (
      <path
        d="M6 3h12v18l-6-4-6 4z"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    ),
  },
  warning: {
    viewBox: '0 0 24 24',
    strokes: (
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </g>
    ),
  },
};

/** The design system's line glyphs, drawn in currentColor; a check is always primary. */
export function Icon({ name, size = 16, className, ...rest }: IconProps) {
  const { viewBox, strokes } = GLYPHS[name];
  // Decorative unless the caller labels it (`aria-hidden={false}`, `aria-label`).
  return (
    <svg
      aria-hidden
      focusable={false}
      {...rest}
      width={size}
      height={size}
      className={cx('elb-icon', `elb-icon--${name}`, className)}
      viewBox={viewBox}
    >
      {strokes}
    </svg>
  );
}
