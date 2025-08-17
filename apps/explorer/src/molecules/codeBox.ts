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

  // Create base box
  const box = createBox(element, {
    label: options.label,
    showHeader: true,
    className: 'elb-code-box',
  });

  // Create editor in content area
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

  // Update tab button states
  function updateTabButtons() {
    const tabButtons = box.getHeader()?.querySelectorAll('.elb-tab-btn');
    tabButtons?.forEach((btn) => {
      const tab = btn.getAttribute('data-tab');
      if (tab === activeTab) {
        btn.classList.add('elb-tab-btn--active');
      } else {
        btn.classList.remove('elb-tab-btn--active');
      }
    });
  }

  // Add tabs to header if enabled
  if (tabsEnabled && box.getHeader()) {
    const tabsContainer = createElement('div', { class: 'elb-code-tabs' });

    tabItems.forEach((tab) => {
      const isDisabled = options.tabs?.disabled?.includes(tab) || false;
      const isActive = tab === activeTab;

      // Create button element directly since ButtonAPI doesn't have getElement
      const button = createElement(
        'button',
        {
          class: `elb-tab-btn ${isActive ? 'elb-tab-btn--active' : ''}`,
          'data-tab': tab,
          disabled: isDisabled,
        },
        tab.toUpperCase(),
      );

      button.addEventListener('click', () => switchTab(tab));
      tabsContainer.appendChild(button);
    });

    box.getHeader()?.appendChild(tabsContainer);
  }

  // Add controls to header if requested
  if (options.showControls && box.getHeader()) {
    const controls = createElement('div', { class: 'elb-code-box-controls' });

    // Default controls: Copy is always shown
    const copyBtn = createIconButton(controls, {
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
      const formatBtn = createIconButton(controls, {
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

    box.getHeader()!.appendChild(controls);
  }

  // Inject additional styles
  injectCodeBoxStyles(element);

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

/**
 * Inject code box specific styles
 */
function injectCodeBoxStyles(element: HTMLElement): void {
  const root = element.getRootNode();
  const target = root instanceof ShadowRoot ? root : document.head;

  if (target.querySelector('#elb-code-box-styles')) return;

  const styles = `
    .elb-code-box .elb-box-content {
      padding: 0;
      background: transparent;
    }
    
    .elb-code-box-controls {
      display: flex;
      gap: var(--elb-spacing-xs);
      margin-left: auto;
    }
    
    .elb-code-box .elb-box-header {
      padding-right: var(--elb-spacing-xs);
    }
    
    /* Tab styles */
    .elb-code-tabs {
      display: inline-flex;
      gap: 2px;
      background: var(--elb-bg-secondary, #f3f4f6);
      padding: 2px;
      border-radius: 6px;
      margin-left: auto;
      margin-right: var(--elb-spacing-sm);
    }
    
    .elb-tab-btn {
      padding: 4px 12px !important;
      background: transparent !important;
      border: none !important;
      color: var(--elb-fg-muted, #6b7280) !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      border-radius: 4px !important;
      transition: all 150ms ease !important;
      text-transform: uppercase !important;
      letter-spacing: 0.025em !important;
      min-width: auto !important;
      height: auto !important;
      box-shadow: none !important;
      transform: none !important;
    }
    
    .elb-tab-btn:hover:not(:disabled) {
      background: var(--elb-bg-hover, #e5e7eb) !important;
      color: var(--elb-fg, #111827) !important;
      transform: none !important;
      box-shadow: none !important;
    }
    
    .elb-tab-btn--active {
      background: var(--elb-bg-primary, #ffffff) !important;
      color: var(--elb-accent, #3b82f6) !important;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
    }
    
    .elb-tab-btn:disabled {
      opacity: 0.5 !important;
      cursor: not-allowed !important;
    }
    
    .elb-tab-btn:focus {
      outline: none !important;
      box-shadow: 0 0 0 2px var(--elb-accent, #3b82f6) !important;
    }
    
    /* Consistent borderless icon buttons */
    .elb-code-box-controls .elb-icon-button {
      background: transparent !important;
      border: none !important;
      color: var(--elb-muted);
      box-shadow: none !important;
    }
    
    .elb-code-box-controls .elb-icon-button:hover:not(:disabled) {
      background: transparent !important;
      color: var(--elb-fg);
      transform: none !important;
      box-shadow: none !important;
    }
    
    .elb-code-box-controls .elb-icon-button:focus {
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
    }
    
    .elb-code-box-controls .elb-icon-button:focus-visible {
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
    }
    
    .elb-code-box-controls .elb-icon-button:active {
      background: transparent !important;
      box-shadow: none !important;
    }
  `;

  const styleElement = createElement(
    'style',
    { id: 'elb-code-box-styles' },
    styles,
  );
  target.appendChild(styleElement);
}
