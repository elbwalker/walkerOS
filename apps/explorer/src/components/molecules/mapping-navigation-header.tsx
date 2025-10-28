import { MappingBreadcrumb } from '../atoms/mapping-breadcrumb';
import { MappingConfirmButton } from '../atoms/mapping-confirm-button';
import type { BreadcrumbSegment } from '../../utils/mapping-path';
import type { NodeType } from '../../hooks/useMappingNavigation';

/**
 * Navigation header combining breadcrumb, tree toggle, and action button
 *
 * Displayed above the tab bar to provide context and navigation controls
 */
export interface MappingNavigationHeaderProps {
  breadcrumb: BreadcrumbSegment[];
  paneType?: NodeType;
  showTreeButton?: boolean;
  showCodeButton?: boolean;
  codeViewActive?: boolean;
  showActionButton?: boolean;
  actionButtonLabel?: string;
  showDeleteButton?: boolean;
  validationErrors?: number;
  onNavigate: (path: string[]) => void;
  onToggleTree?: () => void;
  onToggleCode?: () => void;
  onActionClick?: () => void;
  onDeleteClick?: () => void;
  onValidationClick?: () => void;
  className?: string;
}

export function MappingNavigationHeader({
  breadcrumb,
  paneType,
  showTreeButton = true,
  showCodeButton = false,
  codeViewActive = false,
  showActionButton = false,
  actionButtonLabel = '+ Add',
  showDeleteButton = false,
  validationErrors = 0,
  onNavigate,
  onToggleTree,
  onToggleCode,
  onActionClick,
  onDeleteClick,
  onValidationClick,
  className = '',
}: MappingNavigationHeaderProps) {
  return (
    <div className={`elb-mapping-navigation-header ${className}`}>
      <div className="elb-mapping-navigation-left">
        {showTreeButton && (
          <button
            type="button"
            className="elb-mapping-tree-toggle-button"
            onClick={onToggleTree}
            aria-label="Toggle tree view"
            title="Toggle tree view"
          >
            ≡
          </button>
        )}

        <MappingBreadcrumb segments={breadcrumb} onNavigate={onNavigate} />

        {paneType && <span className="elb-mapping-pane-type">{paneType}</span>}

        {validationErrors > 0 && onValidationClick && (
          <button
            type="button"
            className="elb-validation-warning-badge"
            onClick={onValidationClick}
            aria-label={`${validationErrors} validation ${validationErrors === 1 ? 'error' : 'errors'}`}
            title={`${validationErrors} validation ${validationErrors === 1 ? 'error' : 'errors'}. Click to view.`}
          >
            <span className="elb-validation-warning-icon">⚠</span>
            <span className="elb-validation-warning-count">
              {validationErrors}
            </span>
          </button>
        )}
      </div>

      <div className="elb-mapping-navigation-right">
        {showCodeButton && onToggleCode && (
          <button
            type="button"
            className={`elb-mapping-code-toggle-button ${codeViewActive ? 'is-active' : ''}`}
            onClick={onToggleCode}
            aria-label={codeViewActive ? 'Show visual view' : 'Show code view'}
            title={codeViewActive ? 'Show visual view' : 'Show code view'}
          >
            <span>{codeViewActive ? 'Visual' : 'Code'}</span>
          </button>
        )}

        {showDeleteButton && onDeleteClick && (
          <MappingConfirmButton
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.5 1.5V2.5H2V4H3V13.5C3 14.3284 3.67157 15 4.5 15H11.5C12.3284 15 13 14.3284 13 13.5V4H14V2.5H9.5V1.5H6.5ZM4.5 4H11.5V13.5H4.5V4ZM6 5.5V12H7.5V5.5H6ZM8.5 5.5V12H10V5.5H8.5Z"
                  fill="currentColor"
                />
              </svg>
            }
            confirmLabel="Delete?"
            onConfirm={onDeleteClick}
            ariaLabel="Delete this item"
            className="elb-mapping-delete-button"
          />
        )}

        {showActionButton && onActionClick && (
          <button
            type="button"
            className="elb-mapping-action-button"
            onClick={onActionClick}
            aria-label={actionButtonLabel}
            title={actionButtonLabel}
          >
            {actionButtonLabel}
          </button>
        )}
      </div>
    </div>
  );
}
