import type { BreadcrumbSegment } from '../../utils/mapping-path';

/**
 * Clickable breadcrumb trail for navigation
 *
 * Displays a path like: Root > product view > Data > Map > items
 * Each segment is clickable to navigate to that level
 */
export interface MappingBreadcrumbProps {
  segments: BreadcrumbSegment[];
  onNavigate: (path: string[]) => void;
  className?: string;
}

export function MappingBreadcrumb({
  segments,
  onNavigate,
  className = '',
}: MappingBreadcrumbProps) {
  return (
    <nav
      className={`elb-mapping-breadcrumb ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="elb-mapping-breadcrumb-list">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const isRoot = segment.nodeType === 'root';
          const isClickable = !isLast || isRoot;

          return (
            <li
              key={segment.path.join('.')}
              className="elb-mapping-breadcrumb-item"
            >
              {isClickable ? (
                <>
                  <button
                    type="button"
                    className={`elb-mapping-breadcrumb-link ${isRoot ? 'is-root' : ''}`}
                    onClick={() => onNavigate(segment.path)}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {segment.label}
                  </button>
                  {!isLast && (
                    <span
                      className="elb-mapping-breadcrumb-separator"
                      aria-hidden="true"
                    >
                      /
                    </span>
                  )}
                </>
              ) : (
                <span className="elb-mapping-breadcrumb-current">
                  {segment.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
