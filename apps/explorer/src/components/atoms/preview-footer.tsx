import React from 'react';

export interface PreviewFooterButton {
  type: string;
  label: string;
  highlightClass: string;
}

export interface PreviewFooterProps {
  highlights: Set<string>;
  onToggle: (type: string) => void;
  buttons?: PreviewFooterButton[];
}

const defaultButtons: PreviewFooterButton[] = [
  { type: 'context', label: 'Context', highlightClass: 'highlight-context' },
  { type: 'entity', label: 'Entity', highlightClass: 'highlight-entity' },
  { type: 'property', label: 'Property', highlightClass: 'highlight-property' },
  { type: 'action', label: 'Action', highlightClass: 'highlight-action' },
];

/**
 * PreviewFooter - Footer with highlight toggle buttons
 *
 * Renders a set of buttons to toggle highlighting of walkerOS data attributes.
 * Designed to be used with Box footer prop for preview components.
 *
 * @example
 * const [highlights, setHighlights] = useState<Set<string>>(new Set());
 * const handleToggle = (type: string) => {
 *   setHighlights(prev => {
 *     const next = new Set(prev);
 *     next.has(type) ? next.delete(type) : next.add(type);
 *     return next;
 *   });
 * };
 *
 * <Box footer={<PreviewFooter highlights={highlights} onToggle={handleToggle} />}>
 *   Preview content
 * </Box>
 */
export function PreviewFooter({
  highlights,
  onToggle,
  buttons = defaultButtons,
}: PreviewFooterProps) {
  return (
    <div className="elb-preview-footer">
      {buttons.map((button) => (
        <button
          key={button.type}
          className={`elb-preview-btn ${
            highlights.has(button.type) ? button.highlightClass : ''
          }`}
          onClick={() => onToggle(button.type)}
          type="button"
        >
          {button.label}
        </button>
      ))}
    </div>
  );
}
