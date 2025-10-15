import { Label } from '../ui/label';
import { CodeEditor } from './code-editor';

export interface CodePanelProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  language?: string;
}

export function CodePanel({
  label,
  value,
  onChange,
  disabled = false,
  language,
}: CodePanelProps) {
  return (
    <div className="explorer-panel explorer-flex-1 flex flex-col">
      <Label>{label}</Label>
      <div className="explorer-flex-1" style={{ overflow: 'visible' }}>
        <CodeEditor
          value={value}
          onChange={onChange}
          disabled={disabled}
          language={language}
        />
      </div>
    </div>
  );
}
