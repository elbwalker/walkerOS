import React, { useState, useMemo } from 'react';
import { Box } from '../atoms/box';
import { ButtonGroup } from './button-group';
import { CodeEditor } from './code-editor';

export interface BrowserBoxProps {
  html?: string;
  css?: string;
  js?: string;
  onHtmlChange?: (value: string) => void;
  onCssChange?: (value: string) => void;
  onJsChange?: (value: string) => void;
  label?: string;
  theme?: 'light' | 'dark';
  className?: string;
  initialTab?: 'html' | 'css' | 'js';
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
  label = 'Code',
  theme = 'light',
  className = '',
  initialTab,
}: BrowserBoxProps) {
  // Determine available tabs
  const availableTabs = useMemo(() => {
    const tabs: Array<{ label: string; value: string }> = [];
    if (html !== undefined) tabs.push({ label: 'HTML', value: 'html' });
    if (css !== undefined) tabs.push({ label: 'CSS', value: 'css' });
    if (js !== undefined) tabs.push({ label: 'JS', value: 'js' });
    return tabs;
  }, [html, css, js]);

  // Set initial active tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (initialTab && availableTabs.some((t) => t.value === initialTab)) {
      return initialTab;
    }
    return availableTabs[0]?.value || 'html';
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
      <CodeEditor
        value={content}
        onChange={onChange}
        language={language}
        theme={theme}
        disabled={!onChange}
      />
    </Box>
  );
}
