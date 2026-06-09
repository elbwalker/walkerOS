import React from 'react';
import type { TagType } from './types';

export interface TagProps {
  type: TagType;
  /** Tab label: the tag's own identifier (entity / context key / global key /
   * action verb / property key). Never the type word; color conveys the type. */
  name: string;
  /** Resolved value; absent means shape-only. */
  value?: string;
  /** Optional freeform caption shown centered in the body. */
  label?: string;
  /** For type 'context': depth rank (closest = 0). Retained on the model but not
   * rendered: the tab carries only the identifier. */
  contextIndex?: number;
  /** When false the straddle tab is hidden (hover-caption mode); the box and
   * value still render so geometry never changes. Defaults to true. */
  showCaption?: boolean;
  /** Positioning supplied by the layout layer (e.g. overlay coordinates). */
  style?: React.CSSProperties;
  className?: string;
  selected?: boolean;
  dragging?: boolean;
  /** When true the header is filled (active). Driven by the hovered containing
   * chain so the whole related path (e.g. entity + its action) highlights
   * together, not just the box under the pointer. */
  highlighted?: boolean;
  children?: React.ReactNode;
}

/**
 * The unified visual atom: one rectangle with a straddling pill-tab header and a
 * centered body, like a tagged DOM element. The `type` drives color only; the
 * layout layer supplies `style` and/or nested `children`. Appearance only and
 * pure: it knows nothing about where it sits or how big it is. All styling is
 * theme-variable driven via the `.elb-tag-skeleton` BEM block.
 */
export function Tag({
  type,
  name,
  value,
  label,
  showCaption = true,
  style,
  className,
  selected,
  dragging,
  highlighted,
  children,
}: TagProps): React.ReactElement {
  return (
    <div
      className={[
        'elb-tag-skeleton__box',
        `elb-tag-skeleton__box--${type}`,
        selected ? 'elb-tag-skeleton__box--selected' : undefined,
        dragging ? 'elb-tag-skeleton__box--dragging' : undefined,
        highlighted ? 'elb-tag-skeleton__box--highlighted' : undefined,
        showCaption ? undefined : 'elb-tag-skeleton__box--no-caption',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-kind={type}
      data-name={name}
      style={style}
    >
      <span className="elb-tag-skeleton__tab">{name}</span>
      <div className="elb-tag-skeleton__body">
        {label && <div className="elb-tag-skeleton__label">{label}</div>}
        {value !== undefined && (
          <div className="elb-tag-skeleton__value">{value}</div>
        )}
        {children}
      </div>
    </div>
  );
}
