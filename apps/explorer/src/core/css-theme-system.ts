/**
 * CSS-Based Theme System
 *
 * Uses CSS custom properties with fallback chain for theming.
 * Supports parent theme inheritance (e.g., from website html[data-theme]).
 * Transparent backgrounds by default for embedded usage.
 */

export const CSS_THEME_VARIABLES = `
  :root,
  [data-theme="light"],
  html[data-theme="light"] .explorer-component,
  html[data-theme="light"] [class*="explorer-"] {
    /* Base colors - transparent by default for website integration */
    --explorer-bg-primary: transparent;
    --explorer-bg-primary-opaque: #ffffff;
    --explorer-bg-secondary: rgba(248, 250, 252, 0.8);
    --explorer-bg-tertiary: rgba(241, 245, 249, 0.9);
    --explorer-bg-input: #fafafa;
    
    /* Text colors */
    --explorer-text-primary: #1f2937;
    --explorer-text-secondary: #6b7280;
    --explorer-text-muted: #9ca3af;
    --explorer-text-inverse: #ffffff;
    
    /* Border colors */
    --explorer-border-primary: #d1d5db;
    --explorer-border-secondary: #e5e7eb;
    --explorer-border-focus: #3b82f6;
    
    /* Action colors */
    --explorer-primary: #3b82f6;
    --explorer-primary-hover: #2563eb;
    --explorer-primary-active: #1d4ed8;
    
    --explorer-success: #10b981;
    --explorer-success-hover: #059669;
    --explorer-success-active: #047857;
    
    --explorer-warning: #f59e0b;
    --explorer-warning-hover: #d97706;
    --explorer-warning-active: #b45309;
    
    --explorer-danger: #ef4444;
    --explorer-danger-hover: #dc2626;
    --explorer-danger-active: #b91c1c;
    
    /* Surface colors */
    --explorer-surface-hover: #f1f5f9;
    --explorer-surface-active: #e2e8f0;
    --explorer-surface-selected: #dbeafe;
    
    /* Shadow colors */
    --explorer-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --explorer-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --explorer-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    
    /* Scrollbar colors */
    --explorer-scrollbar-track: #f1f5f9;
    --explorer-scrollbar-thumb: #cbd5e1;
    --explorer-scrollbar-thumb-hover: #94a3b8;
  }

  [data-theme="dark"],
  html[data-theme="dark"] .explorer-component,
  html[data-theme="dark"] [class*="explorer-"] {
    /* Base colors - transparent by default for website integration */
    --explorer-bg-primary: transparent;
    --explorer-bg-primary-opaque: #1f2937;
    --explorer-bg-secondary: rgba(55, 65, 81, 0.8);
    --explorer-bg-tertiary: rgba(75, 85, 99, 0.9);
    --explorer-bg-input: #111827;
    
    /* Text colors */
    --explorer-text-primary: #f3f4f6;
    --explorer-text-secondary: #d1d5db;
    --explorer-text-muted: #9ca3af;
    --explorer-text-inverse: #1f2937;
    
    /* Border colors */
    --explorer-border-primary: #374151;
    --explorer-border-secondary: #4b5563;
    --explorer-border-focus: #3b82f6;
    
    /* Action colors remain the same for consistency */
    --explorer-primary: #3b82f6;
    --explorer-primary-hover: #2563eb;
    --explorer-primary-active: #1d4ed8;
    
    --explorer-success: #10b981;
    --explorer-success-hover: #059669;
    --explorer-success-active: #047857;
    
    --explorer-warning: #f59e0b;
    --explorer-warning-hover: #d97706;
    --explorer-warning-active: #b45309;
    
    --explorer-danger: #ef4444;
    --explorer-danger-hover: #dc2626;
    --explorer-danger-active: #b91c1c;
    
    /* Surface colors */
    --explorer-surface-hover: #374151;
    --explorer-surface-active: #4b5563;
    --explorer-surface-selected: #1e3a8a;
    
    /* Shadow colors */
    --explorer-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
    --explorer-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
    --explorer-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
    
    /* Scrollbar colors */
    --explorer-scrollbar-track: #374151;
    --explorer-scrollbar-thumb: #6b7280;
    --explorer-scrollbar-thumb-hover: #9ca3af;
  }
`;

export const CSS_COMPONENT_STYLES = `
  /* Base component styles */
  .explorer-component {
    color: var(--explorer-text-primary);
    background-color: var(--explorer-bg-primary);
    border-color: var(--explorer-border-primary);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    box-sizing: border-box;
    transition: all 0.2s ease-in-out;
  }

  .explorer-component *,
  .explorer-component *::before,
  .explorer-component *::after {
    box-sizing: border-box;
  }

  /* Header styles */
  .explorer-header {
    background-color: var(--explorer-bg-secondary);
    border-bottom: 1px solid var(--explorer-border-secondary);
    color: var(--explorer-text-primary);
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 40px;
    user-select: none;
  }

  .explorer-header-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--explorer-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .explorer-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }

  /* Button styles */
  .explorer-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    margin: 0;
    border: none;
    border-radius: 4px;
    background-color: transparent;
    color: var(--explorer-text-secondary);
    cursor: pointer;
    font-size: 12px;
    transition: all 0.15s ease-in-out;
    outline: none;
  }

  .explorer-button:hover {
    background-color: var(--explorer-surface-hover);
    color: var(--explorer-text-primary);
    transform: translateY(-1px);
  }

  .explorer-button:active {
    background-color: var(--explorer-surface-active);
    transform: translateY(0);
  }

  .explorer-button:focus-visible {
    outline: 2px solid var(--explorer-border-focus);
    outline-offset: 2px;
  }

  .explorer-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  /* Button variants */
  .explorer-button--primary {
    background-color: var(--explorer-primary);
    color: var(--explorer-text-inverse);
  }

  .explorer-button--primary:hover:not(:disabled) {
    background-color: var(--explorer-primary-hover);
  }

  .explorer-button--primary:active:not(:disabled) {
    background-color: var(--explorer-primary-active);
  }

  .explorer-button--success {
    background-color: var(--explorer-success);
    color: var(--explorer-text-inverse);
  }

  .explorer-button--success:hover:not(:disabled) {
    background-color: var(--explorer-success-hover);
  }

  .explorer-button--danger {
    background-color: var(--explorer-danger);
    color: var(--explorer-text-inverse);
  }

  .explorer-button--danger:hover:not(:disabled) {
    background-color: var(--explorer-danger-hover);
  }

  /* Container styles */
  .explorer-container {
    background-color: var(--explorer-bg-primary);
    border: 1px solid var(--explorer-border-primary);
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .explorer-container--elevated {
    box-shadow: var(--explorer-shadow-md);
  }

  /* Content area styles */
  .explorer-content {
    flex: 1;
    min-height: 0;
    background-color: var(--explorer-bg-input);
  }

  /* Input/Editor styles */
  .explorer-input,
  .explorer-textarea {
    background-color: var(--explorer-bg-input);
    color: var(--explorer-text-primary);
    border: 1px solid var(--explorer-border-primary);
    border-radius: 4px;
    padding: 12px;
    font-family: 'Fira Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.5;
    outline: none;
    transition: border-color 0.2s ease;
  }

  .explorer-input:focus,
  .explorer-textarea:focus {
    border-color: var(--explorer-border-focus);
    box-shadow: 0 0 0 2px var(--explorer-border-focus)40;
  }

  .explorer-textarea {
    resize: none;
    font-variant-ligatures: normal;
    font-feature-settings: "liga" 1, "calt" 1;
  }

  .explorer-textarea::placeholder {
    color: var(--explorer-text-muted);
    opacity: 1;
  }

  .explorer-textarea::selection {
    background-color: var(--explorer-surface-selected);
  }

  /* Scrollbar styles */
  .explorer-component *::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .explorer-component *::-webkit-scrollbar-track {
    background: var(--explorer-scrollbar-track);
  }

  .explorer-component *::-webkit-scrollbar-thumb {
    background: var(--explorer-scrollbar-thumb);
    border-radius: 4px;
  }

  .explorer-component *::-webkit-scrollbar-thumb:hover {
    background: var(--explorer-scrollbar-thumb-hover);
  }

  /* Panel layout styles */
  .explorer-panels {
    display: grid;
    gap: 1px;
    background-color: var(--explorer-border-secondary);
    flex: 1;
    min-height: 0;
  }

  .explorer-panel {
    background-color: var(--explorer-bg-primary);
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  /* Responsive grid templates */
  .explorer-panels--two-column {
    grid-template-columns: 1fr 1fr;
  }

  .explorer-panels--three-column {
    grid-template-columns: 1fr 1fr 1fr;
  }

  .explorer-panels--single-column {
    grid-template-columns: 1fr;
  }

  @media (max-width: 768px) {
    .explorer-panels--two-column,
    .explorer-panels--three-column {
      grid-template-columns: 1fr !important;
      grid-template-rows: auto auto auto;
    }
  }

  /* Animation utilities */
  .explorer-fade-in {
    animation: explorer-fade-in 0.2s ease-out;
  }

  @keyframes explorer-fade-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Loading states */
  .explorer-loading {
    opacity: 0.6;
    pointer-events: none;
  }

  /* Status indicators */
  .explorer-status--success {
    border-left: 4px solid var(--explorer-success);
  }

  .explorer-status--error {
    border-left: 4px solid var(--explorer-danger);
  }

  .explorer-status--warning {
    border-left: 4px solid var(--explorer-warning);
  }
`;

/**
 * Utility function to set theme on an element
 * Checks for website context to avoid conflicts
 */
export function setElementTheme(
  element: HTMLElement | ShadowRoot | DocumentFragment,
  theme: 'light' | 'dark',
): void {
  // Check if we're in a website context (html has data-theme)
  const htmlTheme = document.documentElement.getAttribute('data-theme');
  if (htmlTheme && (htmlTheme === 'light' || htmlTheme === 'dark')) {
    // Website context - don't override, just add explorer class for targeting
    if (element instanceof HTMLElement) {
      element.classList.add('explorer-component');
    }
    return;
  }

  // Standalone context - apply theme normally
  if (element instanceof HTMLElement) {
    element.setAttribute('data-theme', theme);
  } else if (element instanceof ShadowRoot) {
    // For shadow roots, set the attribute on the host element if available
    if (element.host instanceof HTMLElement) {
      element.host.setAttribute('data-theme', theme);
    }
  } else if (element instanceof DocumentFragment) {
    // For document fragments, we can't set attributes, so skip
    // The theme will be inherited from the parent when attached
  }
}

/**
 * Utility function to get current theme from element or parent context
 */
export function getElementTheme(element: HTMLElement): 'light' | 'dark' {
  // Check website context first
  const htmlTheme = document.documentElement.getAttribute('data-theme');
  if (htmlTheme === 'light' || htmlTheme === 'dark') {
    return htmlTheme;
  }

  // Check element's own theme
  const elementTheme = element.getAttribute('data-theme') as 'light' | 'dark';
  if (elementTheme) {
    return elementTheme;
  }

  // Default fallback
  return 'light';
}

/**
 * Utility function to toggle theme on an element
 */
export function toggleElementTheme(element: HTMLElement): 'light' | 'dark' {
  const currentTheme = getElementTheme(element);
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setElementTheme(element, newTheme);
  return newTheme;
}

/**
 * Get the complete CSS for theming
 */
export function getThemeCSS(): string {
  return CSS_THEME_VARIABLES + '\n\n' + CSS_COMPONENT_STYLES;
}
