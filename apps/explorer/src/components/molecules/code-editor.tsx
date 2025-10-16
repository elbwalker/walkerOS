import React, { type ComponentType, useEffect, useState } from 'react';
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
  const [monacoTheme, setMonacoTheme] = useState('vs-light');

  useEffect(() => {
    const checkTheme = () => {
      const isDark =
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.body.getAttribute('data-theme') === 'dark';
      setMonacoTheme(isDark ? 'vs-dark' : 'vs-light');
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  const handleChange = (value: string | undefined) => {
    if (onChange && value !== undefined) {
      onChange(value);
    }
  };

  const MonacoEditor = Editor as ComponentType<{
    height: string;
    language: string;
    value: string;
    onChange: (value: string | undefined) => void;
    theme: string;
    options: Record<string, unknown>;
  }>;

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
