import { Editor } from '@monaco-editor/react';
import { cn } from '@/lib/utils';
import type { ComponentType } from 'react';

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  language?: string;
  className?: string;
  theme?: 'light' | 'dark';
}

export function CodeEditor({
  value,
  onChange,
  disabled = false,
  language = 'javascript',
  className,
  theme = 'light',
}: CodeEditorProps) {
  const handleChange = (value: string | undefined) => {
    if (onChange && value !== undefined) {
      onChange(value);
    }
  };

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs-light';

  const MonacoEditor = Editor as ComponentType<any>;

  return (
    <div className={cn('explorer-code-editor', className)}>
      <MonacoEditor
        height="100%"
        language={language}
        value={value}
        onChange={handleChange}
        theme={monacoTheme}
        options={{
          readOnly: disabled,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          lineNumbersMinChars: 2,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'off',
          fixedOverflowWidgets: true,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            alwaysConsumeMouseWheel: false,
          },
        }}
      />
    </div>
  );
}
