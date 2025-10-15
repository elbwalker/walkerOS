import { Label } from '../ui/label';
import { CodeEditor } from './code-editor';

export interface CodePanelProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  language?: string;
  theme?: 'light' | 'dark';
  onFormat?: () => void;
}

export function CodePanel({
  label,
  value,
  onChange,
  disabled = false,
  language,
  theme = 'light',
  onFormat,
}: CodePanelProps) {
  const handleFormat = () => {
    if (!onChange || disabled || language !== 'json') return;

    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
    } catch (e) {
      // Invalid JSON, do nothing
    }
  };

  return (
    <div className="elb-explorer-mapping-box">
      <div className="elb-explorer-mapping-header">
        <span className="elb-explorer-mapping-label">{label}</span>
        {!disabled && language === 'json' && (
          <button
            className="elb-explorer-mapping-btn"
            onClick={onFormat || handleFormat}
            title="Format JSON"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </button>
        )}
      </div>
      <div className="elb-explorer-mapping-editor">
        <CodeEditor
          value={value}
          onChange={onChange}
          disabled={disabled}
          language={language}
          theme={theme}
        />
      </div>
    </div>
  );
}
