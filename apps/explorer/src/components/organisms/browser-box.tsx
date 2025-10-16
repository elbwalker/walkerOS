import React, { useState, useMemo } from 'react';
import { Box } from '../atoms/box';
import { ButtonGroup } from '../atoms/button-group';
import { CodeEditor } from '../molecules/code-editor';
import { Preview } from '../molecules/preview';

export interface BrowserBoxProps {
  html?: string;
  css?: string;
  js?: string;
  onHtmlChange?: (value: string) => void;
  onCssChange?: (value: string) => void;
  onJsChange?: (value: string) => void;
  showPreview?: boolean;
  label?: string;
  theme?: 'light' | 'dark';
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
  theme = 'light',
  className = '',
  initialTab,
}: BrowserBoxProps) {
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
        <Preview html={html || ''} css={css || ''} theme={theme} />
      ) : (
        <CodeEditor
          value={content}
          onChange={onChange}
          language={language}
          theme={theme}
          disabled={!onChange}
        />
      )}
    </Box>
  );
}
