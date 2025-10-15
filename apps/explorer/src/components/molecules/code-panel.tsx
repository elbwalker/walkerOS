import { Label } from '../ui/label';
import { CodeEditor } from './code-editor';
import { ToolbarButton } from './toolbar';
import { CopyIcon } from '../ui/icon';
import { tryCatch } from '@walkeros/core';

export interface CodePanelProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  language?: string;
  showCopy?: boolean;
}

export function CodePanel({
  label,
  value,
  onChange,
  disabled = false,
  language,
  showCopy = true,
}: CodePanelProps) {
  const handleCopy = () => {
    tryCatch(async () => {
      await navigator.clipboard.writeText(value);
    })();
  };

  return (
    <div className="explorer-panel explorer-flex-1 flex flex-col">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {showCopy && (
          <div className="explorer-toolbar">
            <ToolbarButton
              icon={<CopyIcon />}
              label="Copy"
              onClick={handleCopy}
            />
          </div>
        )}
      </div>
      <div className="explorer-flex-1 explorer-overflow-auto">
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
