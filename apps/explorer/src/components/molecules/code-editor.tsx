import { Editor } from '@monaco-editor/react';
import { cn } from '@/lib/utils';

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  language?: string;
  className?: string;
}

export function CodeEditor({
  value,
  onChange,
  disabled = false,
  language = 'javascript',
  className,
}: CodeEditorProps) {
  const handleChange = (value: string | undefined) => {
    if (onChange && value !== undefined) {
      onChange(value);
    }
  };

  return (
    <div className={cn('explorer-code-editor', className)}>
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={handleChange}
        theme="vs-dark"
        options={{
          readOnly: disabled,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          lineNumbersMinChars: 2,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
        }}
      />
    </div>
  );
}
