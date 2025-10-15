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
    <div className="explorer-panel">
      <Label>{label}</Label>
      <div className="explorer-editor-wrapper">
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
