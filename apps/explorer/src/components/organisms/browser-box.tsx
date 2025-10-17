import React, { useState, useMemo, useEffect, type ComponentType } from 'react';
import { Editor } from '@monaco-editor/react';
import { Box } from '../atoms/box';
import { ButtonGroup } from '../atoms/button-group';
import { Preview } from '../molecules/preview';
import { registerPalenightTheme } from '../../themes/palenight';

export interface BrowserBoxProps {
  html?: string;
  css?: string;
  js?: string;
  onHtmlChange?: (value: string) => void;
  onCssChange?: (value: string) => void;
  onJsChange?: (value: string) => void;
  showPreview?: boolean;
  label?: string;
  className?: string;
  initialTab?: 'preview' | 'html' | 'css' | 'js';
}

/**
 * BrowserBox - Code editor with HTML/CSS/JS toggle
 *
 * Displays code editor with button group to switch between HTML, CSS, and JavaScript.
 * Only shows tabs for content that is provided.
 *
 * @example
 * <BrowserBox
 *   html={htmlCode}
 *   css={cssCode}
 *   onHtmlChange={setHtml}
 *   onCssChange={setCss}
 *   label="Code"
 * />
 */
export function BrowserBox({
  html,
  css,
  js,
  onHtmlChange,
  onCssChange,
  onJsChange,
  showPreview = true,
  label = 'Code',
  className = '',
  initialTab,
}: BrowserBoxProps) {
  const [monacoTheme, setMonacoTheme] = useState('vs-light');

  // Theme detection
  useEffect(() => {
    const checkTheme = () => {
      const isDark =
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.body.getAttribute('data-theme') === 'dark';
      setMonacoTheme(isDark ? 'palenight' : 'vs-light');
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

  // Determine available tabs
  const availableTabs = useMemo(() => {
    const tabs: Array<{ label: string; value: string }> = [];
    if (showPreview && html !== undefined)
      tabs.push({ label: 'Preview', value: 'preview' });
    if (html !== undefined) tabs.push({ label: 'HTML', value: 'html' });
    if (css !== undefined) tabs.push({ label: 'CSS', value: 'css' });
    if (js !== undefined) tabs.push({ label: 'JS', value: 'js' });
    return tabs;
  }, [html, css, js, showPreview]);

  // Set initial active tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (initialTab && availableTabs.some((t) => t.value === initialTab)) {
      return initialTab;
    }
    return availableTabs[0]?.value || 'preview';
  });

  // Get current content and language
  const { content, language, onChange } = useMemo(() => {
    switch (activeTab) {
      case 'html':
        return {
          content: html || '',
          language: 'html' as const,
          onChange: onHtmlChange,
        };
      case 'css':
        return {
          content: css || '',
          language: 'css' as const,
          onChange: onCssChange,
        };
      case 'js':
        return {
          content: js || '',
          language: 'javascript' as const,
          onChange: onJsChange,
        };
      default:
        return {
          content: '',
          language: 'text' as const,
          onChange: undefined,
        };
    }
  }, [activeTab, html, css, js, onHtmlChange, onCssChange, onJsChange]);

  // Build button group data
  const buttons = useMemo(
    () =>
      availableTabs.map((tab) => ({
        label: tab.label,
        value: tab.value,
        active: activeTab === tab.value,
      })),
    [availableTabs, activeTab],
  );

  const handleBeforeMount = (monaco: typeof import('monaco-editor')) => {
    registerPalenightTheme(monaco);
  };

  const MonacoEditor = Editor as ComponentType<{
    height: string;
    language: string;
    value: string;
    onChange: (value: string | undefined) => void;
    beforeMount?: (monaco: typeof import('monaco-editor')) => void;
    theme: string;
    options: Record<string, unknown>;
  }>;

  const handleChange = (value: string | undefined) => {
    if (onChange && value !== undefined) {
      onChange(value);
    }
  };

  return (
    <Box
      header={label}
      headerActions={
        availableTabs.length > 1 ? (
          <ButtonGroup buttons={buttons} onButtonClick={setActiveTab} />
        ) : null
      }
      className={className}
    >
      {activeTab === 'preview' ? (
        <Preview html={html || ''} css={css || ''} />
      ) : (
        <MonacoEditor
          height="100%"
          language={language}
          value={content}
          onChange={handleChange}
          beforeMount={handleBeforeMount}
          theme={monacoTheme}
          options={{
            readOnly: !onChange,
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
      )}
    </Box>
  );
}
