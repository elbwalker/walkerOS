/**
 * Consent State Tile
 *
 * Checkbox-like tile for toggling consent state requirements.
 * Styled similar to rule tiles with active/inactive states.
 */
export interface ConsentStateTileProps {
  label: string;
  checked: boolean;
  onClick: () => void;
  className?: string;
}

export function ConsentStateTile({
  label,
  checked,
  onClick,
  className = '',
}: ConsentStateTileProps) {
  return (
    <button
      type="button"
      className={`elb-consent-state-tile ${checked ? 'is-checked' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="elb-consent-state-tile-checkbox">
        {checked && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 3L4.5 8.5L2 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span className="elb-consent-state-tile-label">{label}</span>
    </button>
  );
}
