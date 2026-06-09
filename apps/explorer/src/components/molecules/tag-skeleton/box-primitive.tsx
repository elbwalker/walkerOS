import React from 'react';

/**
 * A single key/value detail on a box: a property, a context entry, or a global.
 * `value` is optional so a skeleton can show the shape ("price") before the
 * data is decided ("price: 29.99").
 */
export interface TagSkeletonDetail {
  key: string;
  value?: string;
}

/** Every container is the same box; the kind only drives color. */
export type BoxKind = 'entity' | 'context' | 'globals';

export interface BoxProps {
  kind: BoxKind;
  /** Tab label: the entity name, or "context" / "globals". */
  name: string;
  label?: string;
  actions?: string[];
  details?: TagSkeletonDetail[];
  className?: string;
  /** Positioning is supplied by the layout layer (e.g. overlay coordinates). */
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * The visual primitive: one rectangle with a pill-tab header and a centered
 * body. It owns appearance only and knows nothing about where it sits or how
 * big it is. The layout layer (auto nesting, or overlay coordinates) supplies
 * `children` and/or `style`. All styling is theme-variable driven.
 */
export function Box({
  kind,
  name,
  label,
  actions,
  details,
  className,
  style,
  children,
}: BoxProps): React.ReactElement {
  return (
    <div
      className={[
        'elb-tag-skeleton__box',
        `elb-tag-skeleton__box--${kind}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-kind={kind}
      data-name={name}
      style={style}
    >
      <span className="elb-tag-skeleton__tab">{name}</span>
      <div className="elb-tag-skeleton__body">
        {label && <div className="elb-tag-skeleton__label">{label}</div>}
        {actions && actions.length > 0 && (
          <div className="elb-tag-skeleton__actions">
            {actions.map((action) => (
              <span key={action} className="elb-tag-skeleton__action">
                {action}
              </span>
            ))}
          </div>
        )}
        {details && details.length > 0 && (
          <div className="elb-tag-skeleton__details">
            {details.map((detail) => (
              <div key={detail.key} className="elb-tag-skeleton__detail">
                <span className="elb-tag-skeleton__detail-key">
                  {detail.key}
                </span>
                {detail.value !== undefined && (
                  <span className="elb-tag-skeleton__detail-value">
                    {detail.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
