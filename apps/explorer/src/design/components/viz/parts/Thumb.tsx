import React from 'react';
import { cx } from '../../cx';

export type ThumbKind = 'bug' | 'tech' | 'food';

const BUG_LINES = [
  'M36 46 L28 42',
  'M35 54 L27 56',
  'M38 61 L31 66',
  'M76 46 L84 42',
  'M77 54 L85 56',
  'M74 61 L81 66',
  'M51 25 Q47 17 42 16',
  'M61 25 Q65 17 70 16',
];

const BUG_SPOTS: ReadonlyArray<readonly [number, number, number]> = [
  [47, 44, 3.4],
  [65, 44, 3.4],
  [45, 56, 2.8],
  [67, 56, 2.8],
];

function Bug() {
  return (
    <>
      <rect className="elb-viz-thumb__ground" width={112} height={86} />
      <ellipse
        className="elb-viz-thumb__shadow"
        cx={56}
        cy={66}
        rx={30}
        ry={6}
      />
      <g
        className="elb-viz-thumb__legs"
        strokeWidth={2.4}
        strokeLinecap="round"
      >
        {BUG_LINES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <circle className="elb-viz-thumb__ink" cx={42} cy={16} r={2} />
      <circle className="elb-viz-thumb__ink" cx={70} cy={16} r={2} />
      <ellipse
        className="elb-viz-thumb__ink"
        cx={56}
        cy={30}
        rx={10}
        ry={7.5}
      />
      <circle className="elb-viz-thumb__eye" cx={52} cy={29} r={1.6} />
      <circle className="elb-viz-thumb__eye" cx={60} cy={29} r={1.6} />
      <ellipse
        className="elb-viz-thumb__shell"
        cx={56}
        cy={50}
        rx={21}
        ry={18}
      />
      <path className="elb-viz-thumb__seam" d="M56 33 L56 68" strokeWidth={2} />
      {BUG_SPOTS.map(([x, y, r]) => (
        <circle
          key={`${x}-${y}`}
          className="elb-viz-thumb__ink"
          cx={x}
          cy={y}
          r={r}
        />
      ))}
      <path
        className="elb-viz-thumb__shine"
        d="M44 38 Q48 35 52 36"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </>
  );
}

function Tech() {
  return (
    <>
      <rect className="elb-viz-thumb__ground" width={112} height={86} />
      <rect
        className="elb-viz-thumb__badge"
        x={38}
        y={25}
        width={36}
        height={36}
        rx={8}
      />
      <circle className="elb-viz-thumb__dot" cx={47} cy={52} r={3.2} />
      <path
        className="elb-viz-thumb__wave"
        d="M45 42 A10 10 0 0 1 57 54"
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <path
        className="elb-viz-thumb__wave"
        d="M45 34.5 A17.5 17.5 0 0 1 64.5 54"
        strokeWidth={3.5}
        strokeLinecap="round"
      />
    </>
  );
}

function Food() {
  return (
    <>
      <rect className="elb-viz-thumb__ground" width={112} height={86} />
      <ellipse
        className="elb-viz-thumb__plate"
        cx={56}
        cy={62}
        rx={44}
        ry={10}
      />
      <ellipse
        className="elb-viz-thumb__loaf"
        cx={56}
        cy={50}
        rx={31}
        ry={19}
      />
      <ellipse
        className="elb-viz-thumb__crust"
        cx={56}
        cy={45}
        rx={25}
        ry={13}
      />
      <path
        className="elb-viz-thumb__score"
        d="M40 44 Q56 35 72 44"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <path
        className="elb-viz-thumb__score"
        d="M44 51 Q56 45 68 51"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </>
  );
}

/** The hero's article thumbnails, painted from viz tokens. */
export function Thumb({ kind }: { kind: ThumbKind }) {
  return (
    <svg
      className={cx('elb-viz-thumb', `elb-viz-thumb--${kind}`)}
      viewBox="0 0 112 86"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {kind === 'bug' ? <Bug /> : kind === 'tech' ? <Tech /> : <Food />}
    </svg>
  );
}
