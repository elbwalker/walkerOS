/**
 * Pane Header - Standardized header for pane views
 *
 * Provides consistent header layout across all pane views with:
 * - Back button (always visible, disabled when no history)
 * - Title
 * - Description
 * - Optional action button (e.g., Reset)
 */
export interface PaneHeaderProps {
  title: string;
  description: string;
  onBack?: () => void;
  canGoBack?: boolean;
  action?: {
    label: string;
    onClick: () => void;
    title?: string;
  };
  className?: string;
}

export function PaneHeader({
  title,
  description,
  onBack,
  canGoBack = false,
  action,
  className = '',
}: PaneHeaderProps) {
  return (
    <div className={`elb-pane-header ${className}`}>
      <div className="elb-pane-header-content">
        <button
          type="button"
          className={`elb-pane-header-back ${!onBack || !canGoBack ? 'is-disabled' : ''}`}
          onClick={onBack && canGoBack ? onBack : undefined}
          disabled={!onBack || !canGoBack}
          aria-label="Go back"
          title={onBack && canGoBack ? 'Go back' : 'No history'}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h3 className="elb-pane-header-title">
          {title}{' '}
          <span className="elb-pane-header-description">{description}</span>
        </h3>
      </div>
      {action && (
        <button
          type="button"
          className="elb-pane-header-action"
          onClick={action.onClick}
          title={action.title}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
