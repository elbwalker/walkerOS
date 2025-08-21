/**
 * CodeBox Molecule Component
 * Code editor with label, controls, and multi-tab support
 */

import type { CodeBoxOptions, CodeBoxAPI } from '../types';
import { createBox } from '../atoms/box';
import { createEditor } from '../atoms/editor';
import { createIconButton } from '../atoms/iconButton';
import { createButton } from '../atoms/button';
import { createElement } from '../lib/dom';
import { formatValue } from '../lib/evaluate';

/**
 * Create a code box component
 */
export function createCodeBox(
  element: HTMLElement,
  options: CodeBoxOptions = {},
): CodeBoxAPI {
  // Multi-tab state
  const tabsEnabled = options.tabs?.enabled || false;
  const tabItems = options.tabs?.items || ['html', 'css', 'js'];
  let activeTab: 'html' | 'css' | 'js' = options.tabs?.active || 'html';
  const contents = {
    html: '',
    css: '',
    js: '',
  };

  // Initialize content based on tabs or single value
  if (tabsEnabled) {
    // Set initial content for active tab
    contents[activeTab] = options.value || '';
  } else {
    // Single editor mode
    contents.html = options.value || '';
  }

  // Create tabs container for header center
  let tabsContainer: HTMLElement | undefined;
  if (tabsEnabled) {
    tabsContainer = createElement('div', { class: 'elb-tab-group' });
  }

  // Create controls container for header right
  let controlsContainer: HTMLElement | undefined;
  if (options.showControls) {
    controlsContainer = createElement('div', {
      class: 'elb-code-box-controls',
    });
  }

  // Create simplified box with header zones and footer - no nested structure
  const box = createBox(element, {
    label: options.label,
    showHeader: true,
    noPadding: true, // No padding for code editor
    className: 'elb-code-box',
    headerCenter: tabsContainer,
    headerRight: controlsContainer,
    footerContent: options.footerContent,
  });

  // Create editor directly in content area with no wrapper
  const editor = createEditor(box.getContent(), {
    value: tabsEnabled ? contents[activeTab] : contents.html,
    language: getLanguageForTab(activeTab),
    readOnly: options.readOnly,
    lineNumbers: options.lineNumbers,
    onChange: (value: string) => {
      // Update content for active tab
      if (tabsEnabled) {
        contents[activeTab] = value;
        // Call onTabChange with all contents
        if (options.onTabChange) {
          options.onTabChange(activeTab, contents);
        }
      } else {
        contents.html = value;
        if (options.onChange) {
          options.onChange(value);
        }
      }
    },
  });

  // Helper function to get language for tab
  function getLanguageForTab(
    tab: 'html' | 'css' | 'js',
  ): 'javascript' | 'json' | 'html' | 'css' {
    switch (tab) {
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'js':
        return 'javascript';
      default:
        return options.language || 'javascript';
    }
  }

  // Store tab button references for managing active states
  const tabButtons: { [key: string]: any } = {};

  // Update tab button states
  function updateTabButtons() {
    Object.keys(tabButtons).forEach((tab) => {
      const button = tabButtons[tab];
      if (button) {
        button.setActive(tab === activeTab);
      }
    });
  }

  // Switch to a different tab
  function switchTab(newTab: 'html' | 'css' | 'js') {
    if (!tabItems.includes(newTab) || activeTab === newTab) return;

    // Save current content
    contents[activeTab] = editor.getValue();

    // Switch to new tab
    activeTab = newTab;
    editor.setValue(contents[activeTab]);
    editor.setLanguage(getLanguageForTab(activeTab));

    // Update tab buttons
    updateTabButtons();

    // Call callback
    if (options.onTabChange) {
      options.onTabChange(activeTab, contents);
    }
  }

  // Add tabs to tabs container if enabled
  if (tabsEnabled && tabsContainer) {
    tabItems.forEach((tab) => {
      const isDisabled = options.tabs?.disabled?.includes(tab) || false;
      const isActive = tab === activeTab;

      // Create button - the createButton function automatically appends to the container
      const tabButton = createButton(tabsContainer, {
        text: tab.toUpperCase(),
        variant: 'tab',
        active: isActive,
        disabled: isDisabled,
        testId: `tab-${tab}`,
        onClick: () => switchTab(tab),
      });

      // Store reference for managing active states
      tabButtons[tab] = tabButton;
    });
  }

  // Add controls to controls container if requested
  if (options.showControls && controlsContainer) {
    // Default controls: Copy is always shown
    const copyBtn = createIconButton(controlsContainer, {
      icon: 'copy',
      tooltip: 'Copy code',
      onClick: async () => {
        const value = editor.getValue();
        try {
          await navigator.clipboard.writeText(value);

          // Visual feedback
          copyBtn.setIcon('check');
          copyBtn.setTooltip('Copied!');
          setTimeout(() => {
            copyBtn.setIcon('copy');
            copyBtn.setTooltip('Copy code');
          }, 2000);

          options.onCopy?.();
        } catch (e) {
          console.error('Failed to copy:', e);
        }
      },
    });

    // Format button (optional)
    if (options.onFormat) {
      const formatBtn = createIconButton(controlsContainer, {
        icon: 'format',
        tooltip: 'Format code',
        onClick: () => {
          const value = editor.getValue();
          try {
            const formatted = formatCode(
              value,
              options.language || 'javascript',
            );
            editor.setValue(formatted);
            options.onFormat?.();
          } catch (e) {
            // Silent fail on format error
          }
        },
      });
    }
  }

  // Note: Styles are now centralized in theme.ts

  // API
  return {
    getValue: () => {
      // Update current tab content before returning
      if (tabsEnabled) {
        contents[activeTab] = editor.getValue();
        return contents[activeTab];
      }
      return editor.getValue();
    },

    setValue: (value: string) => {
      if (tabsEnabled) {
        contents[activeTab] = value;
      } else {
        contents.html = value;
      }
      editor.setValue(value);
    },

    getAllValues: () => {
      // Update current tab before returning all values
      if (tabsEnabled) {
        contents[activeTab] = editor.getValue();
      } else {
        contents.html = editor.getValue();
      }
      return { ...contents };
    },

    setAllValues: (values: { html: string; css: string; js: string }) => {
      Object.assign(contents, values);
      if (tabsEnabled) {
        editor.setValue(contents[activeTab]);
      } else {
        editor.setValue(contents.html);
      }
    },

    getActiveTab: () => activeTab,

    setActiveTab: (tab: 'html' | 'css' | 'js') => {
      if (tabsEnabled) {
        switchTab(tab);
      }
    },

    setLabel: (label: string) => {
      box.setLabel(label);
    },

    setLanguage: (language: string) => {
      editor.setLanguage(language);
    },

    format: () => {
      const value = editor.getValue();
      const formatted = formatCode(value, getLanguageForTab(activeTab));
      editor.setValue(formatted);
    },

    getContainer: () => {
      return box.getContainer();
    },

    destroy: () => {
      editor.destroy();
      box.destroy();
    },
  };
}

/**
 * Format code based on language
 */
function formatCode(code: string, language: string): string {
  if (language === 'json') {
    try {
      const parsed = JSON.parse(code);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return code;
    }
  }

  // Basic JavaScript formatting (very simple)
  return code
    .replace(/;\s*}/g, ';\n}')
    .replace(/{\s*/g, '{\n  ')
    .replace(/}\s*/g, '\n}');
}

// CodeBox styles are now centralized in styles/theme.ts
