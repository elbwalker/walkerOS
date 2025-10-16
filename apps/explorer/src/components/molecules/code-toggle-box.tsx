import React from 'react';
import { Box } from '../atoms/box';
import { SegmentedControlHeader } from './header-toggles';
import { CodeEditor } from './code-editor';

export interface CodeToggleBoxProps {
  header: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  htmlContent?: string;
  cssContent?: string;
  jsContent?: string;
  showHTML?: boolean;
  showCSS?: boolean;
  showJS?: boolean;
  onHtmlChange?: (value: string) => void;
  onCssChange?: (value: string) => void;
  onJsChange?: (value: string) => void;
  theme?: 'light' | 'dark';
  className?: string;
}

export function CodeToggleBox({
  header,
  activeTab,
  onTabChange,
  htmlContent = '',
  cssContent = '',
  jsContent = '',
  showHTML = true,
  showCSS = true,
  showJS = true,
  onHtmlChange,
  onCssChange,
  onJsChange,
  theme = 'light',
  className = '',
}: CodeToggleBoxProps) {
  const getCurrentContent = () => {
    switch (activeTab) {
      case 'HTML':
        return htmlContent;
      case 'CSS':
        return cssContent;
      case 'JS':
        return jsContent;
      default:
        return '';
    }
  };

  const getCurrentLanguage = () => {
    switch (activeTab) {
      case 'HTML':
        return 'html';
      case 'CSS':
        return 'css';
      case 'JS':
        return 'javascript';
      default:
        return 'text';
    }
  };

  const handleContentChange = (value: string) => {
    switch (activeTab) {
      case 'HTML':
        onHtmlChange?.(value);
        break;
      case 'CSS':
        onCssChange?.(value);
        break;
      case 'JS':
        onJsChange?.(value);
        break;
    }
  };

  return (
    <Box
      header={header}
      headerActions={
        <SegmentedControlHeader
          activeTab={activeTab}
          onTabChange={onTabChange}
          showHTML={showHTML}
          showCSS={showCSS}
          showJS={showJS}
        />
      }
      className={className}
    >
      <CodeEditor
        value={getCurrentContent()}
        onChange={handleContentChange}
        language={getCurrentLanguage()}
        theme={theme}
        disabled={!onHtmlChange && !onCssChange && !onJsChange}
      />
    </Box>
  );
}
