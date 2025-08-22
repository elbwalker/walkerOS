/**
 * CodeBox Molecule Component
 * Code editor with label, controls, and multi-tab support
 */

import type { CodeBoxOptions, CodeBoxAPI } from '../types';
import { createBox } from '../atoms/box';
import { createEditor } from '../atoms/editor';
import { createIconButton } from '../atoms/iconButton';
import { createButton } from '../atoms/button';
import { createElement, createShadow } from '../lib/dom';
import { formatValue, parseInput } from '../lib/evaluate';
import { sourceBrowser } from '@walkeros/web-source-browser';
import { isObject } from '@walkeros/core';
import { getCompleteStyles, getStandaloneStyles } from '../styles/theme';

/**
 * Create a code box component
 */
export function createCodeBox(
  element: HTMLElement,
  options: CodeBoxOptions = {},
): CodeBoxAPI {
  // Determine if this should be a standalone component (default: true)
  const isStandalone = options.standalone !== false;

  // Create Shadow DOM container if standalone
  let containerElement = element;
  let shadowRoot: ShadowRoot | undefined;

  if (isStandalone) {
    const { shadow, container } = createShadow(element);
    shadowRoot = shadow;
    containerElement = container;

    // Inject standalone styles for standalone usage
    const styles = document.createElement('style');
    styles.textContent = getStandaloneStyles();
    shadow.appendChild(styles);
  }
  // Multi-tab state
  const tabsEnabled = options.tabs?.enabled || false;
  const tabItems = options.tabs?.items || ['html', 'css', 'js'];
  let activeTab: 'preview' | 'html' | 'css' | 'js' =
    options.tabs?.active || 'html';
  const contents = {
    html: '',
    css: '',
    js: '',
  };

  // Store initial values for reset functionality
  const initialContents = {
    html: '',
    css: '',
    js: '',
  };

  // Initialize content based on tabs or single value
  if (tabsEnabled) {
    // Set initial content for active tab (but not for preview)
    if (activeTab !== 'preview') {
      contents[activeTab] = options.value || '';
      initialContents[activeTab] = options.value || '';
    }
  } else {
    // Single editor mode
    contents.html = options.value || '';
    initialContents.html = options.value || '';
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
  const box = createBox(containerElement, {
    label: options.label,
    showHeader: true,
    noPadding: true, // No padding for code editor
    className: 'elb-code-box',
    headerCenter: tabsContainer,
    headerRight: controlsContainer,
    footerContent: options.footerContent,
    showFooter: options.showFooter !== false, // Show footer by default, users can disable with showFooter: false
  });

  // Create container for switching between editor and preview
  const contentContainer = box.getContent();
  const editorContainer = createElement('div', {
    class: 'elb-editor-container',
    style: activeTab === 'preview' ? 'display: none;' : 'display: block;',
  });
  const previewContainer = createElement('div', {
    class: 'elb-preview-container',
    style: activeTab === 'preview' ? 'display: block;' : 'display: none;',
  });

  contentContainer.appendChild(editorContainer);
  contentContainer.appendChild(previewContainer);

  // Variables for preview functionality
  let currentBrowserSource: any = null;
  let previewContentElement: HTMLElement | null = null;

  // Highlight state for preview
  const highlights = {
    context: false,
    entity: false,
    property: false,
    action: false,
  };

  // Create highlight buttons container (will be shown/hidden based on tab)
  const highlightButtonsContainer = createElement('div', {
    class: 'elb-highlight-buttons',
    style: activeTab === 'preview' ? 'display: flex;' : 'display: none;',
  });

  // Add highlight toggle buttons
  const highlightTypes = [
    { key: 'context', label: 'Context' },
    { key: 'entity', label: 'Entity' },
    { key: 'property', label: 'Property' },
    { key: 'action', label: 'Action' },
  ] as const;

  highlightTypes.forEach(({ key, label }) => {
    const button = createElement(
      'button',
      {
        class: `elb-highlight-btn elb-highlight-btn--${key}`,
        'data-highlight': key,
      },
      label,
    );

    button.addEventListener('click', () => {
      highlights[key] = !highlights[key];
      updateHighlightClasses();
      button.classList.toggle('active', highlights[key]);
    });

    highlightButtonsContainer.appendChild(button);
  });

  // Add highlight buttons to footer if provided, otherwise create footer
  if (options.footerContent) {
    options.footerContent.appendChild(highlightButtonsContainer);
  } else if (options.enableHighlights) {
    box.getFooter()?.appendChild(highlightButtonsContainer);
  }

  // Create editor in the editor container
  const editor = createEditor(editorContainer, {
    value:
      tabsEnabled && activeTab !== 'preview'
        ? contents[activeTab]
        : contents.html,
    language: getLanguageForTab(activeTab),
    readOnly: options.readOnly,
    lineNumbers: options.lineNumbers,
    onChange: (value: string) => {
      // Update content for active tab
      if (tabsEnabled && activeTab !== 'preview') {
        contents[activeTab] = value;
        // Call onTabChange with all contents
        if (options.onTabChange) {
          options.onTabChange(activeTab, contents);
        }
      } else if (!tabsEnabled) {
        contents.html = value;
        if (options.onChange) {
          options.onChange(value);
        }
      }
    },
  });

  // Helper function to get language for tab
  function getLanguageForTab(
    tab: 'preview' | 'html' | 'css' | 'js',
  ): 'javascript' | 'json' | 'html' | 'css' {
    switch (tab) {
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'js':
        return 'javascript';
      case 'preview':
        return 'html'; // Preview doesn't use editor language
      default:
        return options.language || 'javascript';
    }
  }

  // Update highlight classes on preview content
  function updateHighlightClasses() {
    if (!previewContentElement) return;

    // Remove all highlight classes
    previewContentElement.classList.remove(
      'highlight-context',
      'highlight-entity',
      'highlight-property',
      'highlight-action',
    );

    // Add active highlight classes
    Object.entries(highlights).forEach(([key, active]) => {
      if (active && previewContentElement) {
        previewContentElement.classList.add(`highlight-${key}`);
      }
    });
  }

  // Render preview content
  async function renderPreview() {
    // Clear previous content and browser source
    if (currentBrowserSource?.destroy) {
      currentBrowserSource.destroy();
      currentBrowserSource = null;
    }

    // Clear preview container
    previewContainer.innerHTML = '';

    // Create preview element with shadow DOM
    const previewElement = createElement('div', {
      style: 'width: 100%; height: 100%; position: relative; overflow: auto;',
    });
    const { shadow: previewShadow, container: previewContent } =
      createShadow(previewElement);
    previewContainer.appendChild(previewElement);

    // Apply CSS to preview shadow DOM
    if (contents.css.trim()) {
      const styleElement = createElement('style', {}, contents.css);
      previewShadow.appendChild(styleElement);
    }

    // Inject highlight styles
    const highlightStyles = createElement('style', {}, getHighlightStyles());
    previewShadow.appendChild(highlightStyles);

    // Process HTML and set content
    const tempContainer = createElement('div');
    tempContainer.innerHTML = contents.html;

    // Mark property attributes for highlighting
    const entities = Array.from(tempContainer.querySelectorAll('[data-elb]'))
      .map((el) => el.getAttribute('data-elb'))
      .filter((entity): entity is string => !!entity);

    entities.forEach((entity) => {
      tempContainer.querySelectorAll(`[data-elb-${entity}]`).forEach((el) => {
        el.setAttribute('data-elbproperty', '');
      });
    });

    // Set processed HTML to preview content
    previewContent.innerHTML = tempContainer.innerHTML;

    // Store reference and apply highlight classes
    previewContentElement = previewContent;
    updateHighlightClasses();

    // Execute JavaScript if provided with context injection
    if (contents.js.trim()) {
      try {
        await parseInput(contents.js, options.context || {}, false);
      } catch (error) {
        console.error('Error executing JavaScript:', error);
      }
    }

    // Initialize browser source if needed for event capture
    if (options.onPreviewRender) {
      await initializeBrowserSource(previewContent);
    }

    // Call preview render callback
    options.onPreviewRender?.(contents);
  }

  // Initialize browser source for event capture
  async function initializeBrowserSource(
    container: HTMLElement,
  ): Promise<void> {
    try {
      // Get external collector from context
      const externalCollector = options.context?.collector;

      // Create minimal collector for event capture
      const minimalCollector = {
        push: async (...args: any[]) => {
          let event: string;
          let data: any = {};

          if (args.length === 1) {
            if (typeof args[0] === 'string') {
              event = args[0];
            } else {
              event = args[0].event || 'unknown';
              data = args[0].data || {};
            }
          } else if (args.length >= 2) {
            event = args[0] as string;
            data = args[1] || {};
          } else {
            event = 'unknown';
          }

          // Skip internal walker commands
          if (event.startsWith('walker ')) {
            return { ok: true, successful: [], queued: [], failed: [] };
          }

          // Forward events to external collector if available
          console.log('Browser source detected event:', event, data);
          if (
            externalCollector &&
            typeof externalCollector === 'object' &&
            'push' in externalCollector
          ) {
            console.log('Forwarding to external collector...');
            (externalCollector as any).push(event, data);
          }

          // Also check for eventsBox in context
          const eventsBox = options.context?.eventsBox;
          if (
            eventsBox &&
            typeof eventsBox === 'object' &&
            'setValue' in eventsBox
          ) {
            console.log('Directly forwarding to eventsBox...');
            (eventsBox as any).setValue({ event, data });
          }

          return { ok: true, successful: [], queued: [], failed: [] };
        },
        allowed: true,
        config: {
          dryRun: false,
          tagging: 1,
          globalsStatic: false,
          sessionStatic: false,
          verbose: false,
        },
        consent: {},
        count: 0,
        custom: {},
        sources: {},
        destinations: {},
        globals: {},
        group: 'demo',
        hooks: {},
        on: {},
        queue: [],
        round: 0,
        session: undefined,
        timing: Date.now(),
        user: {},
        version: '2.0.0',
      };

      // Initialize browser source
      const result = await sourceBrowser(minimalCollector as any, {
        type: 'browser',
        settings: {
          scope: container,
          pageview: false,
          session: false,
          prefix: 'data-elb',
          elb: '',
          elbLayer: false,
        },
      });

      currentBrowserSource = result.source;

      // Trigger initial scan
      await minimalCollector.push('walker run');
    } catch (error) {
      console.error('Failed to initialize browser source:', error);
    }
  }

  // Get highlight styles
  function getHighlightStyles(): string {
    return `
      :host {
        --highlight-context: #ffbd44cc;
        --highlight-entity: #00ca4ecc;
        --highlight-property: #ff605ccc;
        --highlight-action: #9900ffcc;
      }
      
      .highlight-context [data-elbcontext] {
        box-shadow: 0 0 0 2px var(--highlight-context);
      }
      
      .highlight-entity [data-elb] {
        box-shadow: 0 0 0 2px var(--highlight-entity);
      }
      
      .highlight-property [data-elbproperty] {
        box-shadow: 0 0 0 2px var(--highlight-property);
      }
      
      .highlight-action [data-elbaction] {
        box-shadow: 0 0 0 2px var(--highlight-action);
      }
    `;
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
  function switchTab(newTab: 'preview' | 'html' | 'css' | 'js') {
    if (!tabItems.includes(newTab) || activeTab === newTab) return;

    // Save current content if not preview
    if (activeTab !== 'preview') {
      contents[activeTab] = editor.getValue();
    }

    // Switch to new tab
    activeTab = newTab;

    // Show/hide editor and preview based on tab
    if (activeTab === 'preview') {
      editorContainer.style.display = 'none';
      previewContainer.style.display = 'block';
      highlightButtonsContainer.style.display = options.enableHighlights
        ? 'flex'
        : 'none';
      renderPreview();
    } else {
      editorContainer.style.display = 'block';
      previewContainer.style.display = 'none';
      highlightButtonsContainer.style.display = 'none';
      editor.setValue(contents[activeTab]);
      editor.setLanguage(getLanguageForTab(activeTab));
    }

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

    // If preview is active initially, render it and set button visibility
    if (activeTab === 'preview') {
      highlightButtonsContainer.style.display = options.enableHighlights
        ? 'flex'
        : 'none';
      renderPreview();
    }
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

    // Reset button (optional)
    if (options.showReset) {
      const resetBtn = createIconButton(controlsContainer, {
        customIcon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
          <path d="M3 3v5h5"></path>
        </svg>`,
        tooltip: 'Reset to initial values',
        onClick: () => {
          // Reset to initial values
          if (tabsEnabled) {
            // Multi-tab mode: reset all tabs
            Object.assign(contents, { ...initialContents });
            if (activeTab !== 'preview') {
              editor.setValue(contents[activeTab]);
            } else {
              renderPreview();
            }
          } else {
            // Single editor mode: reset to initial value
            contents.html = initialContents.html;
            editor.setValue(initialContents.html);
          }

          // Call onReset callback if provided
          options.onReset?.();
        },
      });
    }
  }

  // Note: Styles are now centralized in theme.ts

  // Build API object
  const api: CodeBoxAPI = {
    getValue: () => {
      // Update current tab content before returning
      if (tabsEnabled && activeTab !== 'preview') {
        contents[activeTab] = editor.getValue();
        return contents[activeTab];
      } else if (activeTab === 'preview') {
        return JSON.stringify(contents, null, 2);
      }
      return editor.getValue();
    },

    setValue: (value: string) => {
      if (tabsEnabled && activeTab !== 'preview') {
        contents[activeTab] = value;
        editor.setValue(value);
      } else if (activeTab === 'preview') {
        // Can't set value directly on preview
        console.warn('Cannot set value directly on preview tab');
      } else {
        contents.html = value;
        editor.setValue(value);
      }
    },

    getAllValues: () => {
      // Update current tab before returning all values
      if (tabsEnabled && activeTab !== 'preview') {
        contents[activeTab] = editor.getValue();
      } else if (!tabsEnabled) {
        contents.html = editor.getValue();
      }
      return { ...contents };
    },

    setAllValues: (values: { html: string; css: string; js: string }) => {
      Object.assign(contents, values);
      // Also update initial contents for reset functionality
      Object.assign(initialContents, values);
      if (tabsEnabled && activeTab !== 'preview') {
        editor.setValue(contents[activeTab]);
      } else if (activeTab === 'preview') {
        renderPreview();
      } else {
        editor.setValue(contents.html);
      }
    },

    getActiveTab: () => activeTab,

    setActiveTab: (tab: 'preview' | 'html' | 'css' | 'js') => {
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

  return api;
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
 * Create an events box component - specialized for capturing and displaying events
 */
export function createEventsBox(
  element: HTMLElement,
  options: { label?: string; onReset?: () => void; standalone?: boolean } = {},
): CodeBoxAPI {
  // Internal events storage
  let events: unknown[] = [];

  // Create the base code box with fixed settings for events
  // Default to standalone mode since events box is typically used as standalone component
  const codeBox = createCodeBox(element, {
    label: options.label || 'Events',
    value: '// No events captured yet',
    language: 'json',
    standalone: options.standalone !== false, // Default: true
    readOnly: true,
    lineNumbers: false,
    showControls: true,
    showReset: true,
    onReset: () => {
      events = [];
      codeBox.setValue('// Events cleared');
      options.onReset?.();
    },
  });

  // Override setValue to handle events intelligently
  const originalSetValue = codeBox.setValue;
  const enhancedSetValue = (value: string | unknown) => {
    if (isObject(value) && value !== null) {
      // It's an event object - add to events array
      const eventWithTimestamp = {
        timestamp: Date.now(),
        ...value,
      };
      events.push(eventWithTimestamp);
      console.log('📝 Event captured:', eventWithTimestamp);

      // Update display with formatted events
      const displayValue =
        events.length === 1
          ? JSON.stringify(events[0], null, 2)
          : JSON.stringify(events, null, 2);
      originalSetValue(displayValue);
    } else {
      // Regular string value - just set it
      originalSetValue(typeof value === 'string' ? value : String(value));
    }
  };

  // Add event management methods
  const addEvent = (event: unknown) => {
    enhancedSetValue(event);
  };

  const clearEvents = () => {
    events = [];
    originalSetValue('// Events cleared');
  };

  // Return enhanced API
  const api = {
    ...codeBox,
    setValue: enhancedSetValue,
    addEvent,
    clearEvents,
  };

  return api;
}

// CodeBox styles are now centralized in styles/theme.ts
