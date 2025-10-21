/**
 * Pane Header - Standardized header for pane views
 *
 * Provides consistent header layout across all pane views with:
 * - Title
 * - Description
 * - Optional action button (e.g., Reset)
 */
export interface PaneHeaderProps {
  title: string;
  description: string;
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
  action,
  className = '',
}: PaneHeaderProps) {
  return (
    <div className={`elb-pane-header ${className}`}>
      <div className="elb-pane-header-content">
        <h3 className="elb-pane-header-title">{title}</h3>
        <p className="elb-pane-header-description">{description}</p>
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
