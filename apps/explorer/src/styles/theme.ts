/**
 * Theme System
 * CSS variables and theming utilities
 */

import type { ThemeOptions } from '../types';

/**
 * Default theme variables (light mode)
 */
export const defaultTheme = {
  // Light theme colors
  colors: {
    bg: '#fafafa',
    fg: '#0a0a0a',
    border: '#e4e4e7',
    accent: '#2563eb',
    error: '#dc2626',
    success: '#16a34a',
    warning: '#d97706',
    muted: '#71717a',
    surface: '#ffffff',
    hover: '#f4f4f5',
  },

  // Dark theme colors
  darkColors: {
    bg: '#0a0a0a',
    fg: '#fafafa',
    border: '#27272a',
    accent: '#3b82f6',
    error: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
    muted: '#a1a1aa',
    surface: '#18181b',
    hover: '#27272a',
  },

  // Light mode syntax highlighting
  syntax: {
    keyword: '#d73a49',
    string: '#032f62',
    number: '#005cc5',
    comment: '#6a737d',
    function: '#6f42c1',
    operator: '#d73a49',
    punctuation: '#24292e',
  },

  // Dark mode syntax highlighting
  darkSyntax: {
    keyword: '#f97583',
    string: '#9ecbff',
    number: '#79b8ff',
    comment: '#959da5',
    function: '#b392f0',
    operator: '#f97583',
    punctuation: '#f1f8ff',
  },

  // Spacing - Much smaller values
  spacing: {
    xs: '0.125rem', // 2px
    sm: '0.25rem', // 4px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    xl: '1rem', // 16px
  },

  // Typography
  fonts: {
    mono: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
    sans: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },

  fontSize: {
    xs: '0.6875rem', // 11px
    sm: '0.75rem', // 12px
    base: '0.8125rem', // 13px
    lg: '0.875rem', // 14px
  },

  // Layout
  radius: {
    sm: '0.375rem', // 6px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
  },

  shadow: {
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },

  // Transitions
  transition: {
    fast: '150ms ease-in-out',
    base: '250ms ease-in-out',
    slow: '350ms ease-in-out',
  },
};

/**
 * Generate CSS variables for light mode (default)
 */
export function generateLightModeCSS(theme = defaultTheme): string {
  const vars: string[] = [];

  // Light mode colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    vars.push(`--elb-${camelToKebab(key)}: ${value};`);
  });

  // Light mode syntax colors
  Object.entries(theme.syntax).forEach(([key, value]) => {
    vars.push(`--elb-syntax-${camelToKebab(key)}: ${value};`);
  });

  // Spacing, fonts, etc. (theme-agnostic)
  Object.entries(theme.spacing).forEach(([key, value]) => {
    vars.push(`--elb-spacing-${key}: ${value};`);
  });

  Object.entries(theme.fonts).forEach(([key, value]) => {
    vars.push(`--elb-font-${key}: ${value};`);
  });

  Object.entries(theme.fontSize).forEach(([key, value]) => {
    vars.push(`--elb-font-size-${key}: ${value};`);
  });

  Object.entries(theme.radius).forEach(([key, value]) => {
    vars.push(`--elb-radius-${key}: ${value};`);
  });

  Object.entries(theme.shadow).forEach(([key, value]) => {
    vars.push(`--elb-shadow-${key}: ${value};`);
  });

  Object.entries(theme.transition).forEach(([key, value]) => {
    vars.push(`--elb-transition-${key}: ${value};`);
  });

  return vars.join('\n    ');
}

/**
 * Generate CSS variables for dark mode
 */
export function generateDarkModeCSS(theme = defaultTheme): string {
  const vars: string[] = [];

  // Dark mode colors
  Object.entries(theme.darkColors).forEach(([key, value]) => {
    vars.push(`--elb-${camelToKebab(key)}: ${value};`);
  });

  // Dark mode syntax colors
  Object.entries(theme.darkSyntax).forEach(([key, value]) => {
    vars.push(`--elb-syntax-${camelToKebab(key)}: ${value};`);
  });

  return vars.join('\n    ');
}

// Component styles are embedded directly in getCompleteStyles function

/**
 * Get base styles with pure CSS light/dark mode support
 */
export function getBaseStyles(textSize?: 'small' | 'regular'): string {
  const fontSize =
    textSize === 'small'
      ? 'var(--elb-font-size-sm)'
      : 'var(--elb-font-size-base)';

  return `
    /* Light mode (default) */
    :host {
      ${generateLightModeCSS()}
      
      /* Default styles */
      font-family: var(--elb-font-sans);
      font-size: ${fontSize};
      line-height: 1.5;
      color: var(--elb-fg);
      background: var(--elb-bg);
    }
    
    /* Dark mode - triggered by data-theme="dark" on any parent */
    :host([data-theme="dark"]),
    [data-theme="dark"] :host {
      ${generateDarkModeCSS()}
    }
    
    /* Reset styles */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    /* Base component container */
    .elb-explorer-root {
      width: 100%;
      height: 100%;
    }
    
    /* Syntax highlighting classes */
    .elb-syntax-keyword { color: var(--elb-syntax-keyword); font-weight: 600; }
    .elb-syntax-string { color: var(--elb-syntax-string); }
    .elb-syntax-number { color: var(--elb-syntax-number); }
    .elb-syntax-comment { color: var(--elb-syntax-comment); font-style: italic; }
    .elb-syntax-function { color: var(--elb-syntax-function); }
    .elb-syntax-operator { color: var(--elb-syntax-operator); }
    .elb-syntax-punctuation { color: var(--elb-syntax-punctuation); }
    
    /* Line numbers */
    .elb-line-number {
      display: inline-block;
      width: 3em;
      padding-right: var(--elb-spacing-sm);
      margin-right: var(--elb-spacing-sm);
      color: var(--elb-muted);
      text-align: right;
      border-right: 1px solid var(--elb-border);
      user-select: none;
    }
    
    /* Responsive breakpoints */
    .elb-responsive-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    
    @media (max-width: 1024px) {
      .elb-responsive-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    @media (max-width: 768px) {
      .elb-responsive-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
}

/**
 * Get complete styles including centralized component styles
 */
export function getCompleteStyles(textSize?: 'small' | 'regular'): string {
  const baseStyles = getBaseStyles(textSize);

  // Include centralized component styles directly since bundler will handle CSS import
  const componentStyles = getComponentStyles();

  return baseStyles + '\n\n' + componentStyles;
}

/**
 * Get component styles as a string (for bundler compatibility)
 */
function getComponentStyles(): string {
  return `
    /* Button Components */
    .elb-button {
      display: inline-flex;
      align-items: center;
      gap: var(--elb-spacing-xs);
      padding: var(--elb-spacing-xs) var(--elb-spacing-sm);
      font-family: var(--elb-font-sans);
      font-size: var(--elb-font-size-sm);
      font-weight: 500;
      border-radius: var(--elb-radius-sm);
      border: 1px solid transparent;
      cursor: pointer;
      transition: all var(--elb-transition-fast);
      outline: none;
      background: none;
      text-decoration: none;
      box-sizing: border-box;
    }

    .elb-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .elb-button:focus-visible {
      outline: 2px solid var(--elb-accent);
      outline-offset: 2px;
    }

    /* Primary variant */
    .elb-button--primary {
      background: var(--elb-accent);
      color: white;
      border-color: var(--elb-accent);
    }

    .elb-button--primary:hover:not(:disabled) {
      background: var(--elb-accent);
      filter: brightness(1.1);
    }

    /* Secondary variant */
    .elb-button--secondary {
      background: var(--elb-surface);
      color: var(--elb-fg);
      border-color: var(--elb-border);
    }

    .elb-button--secondary:hover:not(:disabled) {
      background: var(--elb-hover);
    }

    /* Ghost variant */
    .elb-button--ghost {
      background: transparent;
      color: var(--elb-fg);
      border-color: transparent;
    }

    .elb-button--ghost:hover:not(:disabled) {
      background: var(--elb-hover);
    }

    /* Tab variant - for HTML/CSS/JS tabs */
    .elb-button--tab {
      padding: 4px 12px;
      font-size: var(--elb-font-size-xs);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.025em;
      background: transparent;
      color: var(--elb-muted);
      border: none;
      border-radius: 4px;
      transition: all var(--elb-transition-fast);
    }

    .elb-button--tab:hover:not(:disabled) {
      background: var(--elb-hover);
      color: var(--elb-fg);
    }

    .elb-button--tab.elb-button--active {
      background: var(--elb-surface);
      color: var(--elb-accent);
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    /* Button content */
    .elb-button-icon {
      display: flex;
      align-items: center;
    }

    .elb-button-text {
      display: inline-block;
    }

    /* Tab Group Container */
    .elb-tab-group {
      display: inline-flex;
      gap: 2px;
      background: var(--elb-hover);
      padding: 2px;
      border-radius: 6px;
      margin-left: auto;
      margin-right: var(--elb-spacing-sm);
    }

    /* Icon Button Specific Styles */
    .elb-icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: var(--elb-spacing-xs);
      font-size: var(--elb-font-size-sm);
      border-radius: var(--elb-radius-sm);
      border: 1px solid transparent;
      background: transparent;
      color: var(--elb-muted);
      cursor: pointer;
      transition: all var(--elb-transition-fast);
      outline: none;
    }

    .elb-icon-button:hover:not(:disabled) {
      background: var(--elb-hover);
      color: var(--elb-fg);
    }

    .elb-icon-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .elb-icon-button:focus-visible {
      outline: 2px solid var(--elb-accent);
      outline-offset: 2px;
    }

    /* Code Box Specific Styles */
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

    /* Box Footer Styles */
    .elb-box-footer {
      padding: var(--elb-spacing-xs);
      background: var(--elb-surface);
      border-top: 1px solid var(--elb-border);
    }

    /* Highlight Colors - matching website implementation */
    .elb-highlight {
      --highlight-context: #ffbd44cc;
      --highlight-entity: #00ca4ecc;
      --highlight-property: #ff605ccc;
      --highlight-action: #9900ffcc;
      --highlight-background: #1f2937;
      --highlight-text: #9ca3af;
      --highlight-hover: rgba(255, 255, 255, 0.05);
      --highlight-separator: rgba(255, 255, 255, 0.05);
    }

    /* Single highlight styles using box-shadow */
    .elb-highlight .highlight-context [data-elbcontext] {
      box-shadow: 0 0 0 2px var(--highlight-context);
    }

    .elb-highlight .highlight-entity [data-elb] {
      box-shadow: 0 0 0 2px var(--highlight-entity);
    }

    .elb-highlight .highlight-property [data-elbproperty] {
      box-shadow: 0 0 0 2px var(--highlight-property);
    }

    .elb-highlight .highlight-action [data-elbaction] {
      box-shadow: 0 0 0 2px var(--highlight-action);
    }

    /* Double combinations with layered box-shadows */
    .elb-highlight .highlight-entity.highlight-action [data-elb][data-elbaction] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-entity);
    }

    .elb-highlight .highlight-entity.highlight-context [data-elb][data-elbcontext] {
      box-shadow:
        0 0 0 2px var(--highlight-entity),
        0 0 0 4px var(--highlight-context);
    }

    .elb-highlight .highlight-entity.highlight-property [data-elb][data-elbproperty] {
      box-shadow:
        0 0 0 2px var(--highlight-entity),
        0 0 0 4px var(--highlight-property);
    }

    .elb-highlight .highlight-action.highlight-context [data-elbaction][data-elbcontext] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-context);
    }

    .elb-highlight .highlight-context.highlight-property [data-elbcontext][data-elbproperty] {
      box-shadow:
        0 0 0 2px var(--highlight-context),
        0 0 0 4px var(--highlight-property);
    }

    .elb-highlight .highlight-action.highlight-property [data-elbaction][data-elbproperty] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-property);
    }

    /* Triple combinations with distinct layers */
    .elb-highlight .highlight-entity.highlight-action.highlight-context [data-elb][data-elbaction][data-elbcontext] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-entity),
        0 0 0 6px var(--highlight-context);
    }

    .elb-highlight .highlight-entity.highlight-action.highlight-property [data-elb][data-elbaction][data-elbproperty] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-entity),
        0 0 0 6px var(--highlight-property);
    }

    .elb-highlight .highlight-entity.highlight-context.highlight-property [data-elb][data-elbcontext][data-elbproperty] {
      box-shadow:
        0 0 0 2px var(--highlight-context),
        0 0 0 4px var(--highlight-entity),
        0 0 0 6px var(--highlight-property);
    }

    .elb-highlight .highlight-action.highlight-context.highlight-property [data-elbaction][data-elbcontext][data-elbproperty] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-context),
        0 0 0 6px var(--highlight-property);
    }

    /* Quadruple combination */
    .elb-highlight .highlight-entity.highlight-action.highlight-context.highlight-property [data-elb][data-elbaction][data-elbcontext][data-elbproperty] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-entity),
        0 0 0 6px var(--highlight-context),
        0 0 0 8px var(--highlight-property);
    }

    /* Button styles - adapted for theme system */
    .elb-highlight-buttons {
      display: flex;
      background: var(--elb-surface);
      border-top: 1px solid var(--elb-border);
    }

    .elb-highlight-btn {
      flex: 1;
      padding: 6px 8px;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--elb-muted);
      border: 0;
      background: transparent;
      transition: all 0.2s ease;
      position: relative;
      border-radius: 6px;
      cursor: pointer;
    }

    .elb-highlight-btn:hover {
      background: var(--elb-hover);
      color: var(--elb-fg);
    }

    .elb-highlight-btn:not(:last-child)::after {
      content: '';
      position: absolute;
      right: 0;
      top: 20%;
      height: 60%;
      width: 1px;
      background: var(--elb-border);
    }

    /* Active state colors with higher specificity */
    .elb-highlight-btn.elb-highlight-btn--context.active,
    .elb-highlight-btn.elb-highlight-btn--context.active:hover {
      color: var(--highlight-context);
    }

    .elb-highlight-btn.elb-highlight-btn--entity.active,
    .elb-highlight-btn.elb-highlight-btn--entity.active:hover {
      color: var(--highlight-entity);
    }

    .elb-highlight-btn.elb-highlight-btn--property.active,
    .elb-highlight-btn.elb-highlight-btn--property.active:hover {
      color: var(--highlight-property);
    }

    .elb-highlight-btn.elb-highlight-btn--action.active,
    .elb-highlight-btn.elb-highlight-btn--action.active:hover {
      color: var(--highlight-action);
    }

    /* Events List Styles */
    .elb-events-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--elb-spacing-xs);
      overflow-y: auto;
      padding: var(--elb-spacing-xs);
      max-height: 120px;
      min-height: 40px;
    }

    .elb-events-list::-webkit-scrollbar {
      width: 4px;
    }

    .elb-events-list::-webkit-scrollbar-track {
      background: var(--elb-hover);
    }

    .elb-events-list::-webkit-scrollbar-thumb {
      background: var(--elb-border);
      border-radius: 2px;
    }

    .elb-event-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--elb-spacing-xs);
      padding: var(--elb-spacing-xs) var(--elb-spacing-sm);
      font-size: var(--elb-font-size-xs);
      font-weight: 500;
      border: 1px solid var(--elb-border);
      border-radius: var(--elb-radius-sm);
      background: var(--elb-surface);
      color: var(--elb-fg);
      cursor: pointer;
      transition: all var(--elb-transition-fast);
      white-space: nowrap;
      height: 24px;
      flex: none;
    }

    .elb-event-btn:hover {
      background: var(--elb-hover);
      border-color: var(--elb-accent);
    }

    .elb-event-btn.active {
      background: var(--elb-accent);
      color: white;
      border-color: var(--elb-accent);
    }

    .elb-event-label {
      font-weight: 500;
    }

    .elb-event-index {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      padding: 2px 6px;
      border-radius: var(--elb-radius-sm);
      font-size: var(--elb-font-size-xs);
      font-weight: 600;
      min-width: 18px;
      text-align: center;
    }

    .elb-event-btn:not(.active) .elb-event-index {
      background: var(--elb-muted);
      color: var(--elb-surface);
    }
  `;
}

/**
 * Convert camelCase to kebab-case
 */
function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Apply theme to element
 */
export function applyTheme(element: HTMLElement, options?: ThemeOptions): void {
  if (options?.mode) {
    element.setAttribute('data-theme', options.mode);
  }

  if (options?.colors) {
    Object.entries(options.colors).forEach(([key, value]) => {
      element.style.setProperty(`--elb-${camelToKebab(key)}`, value);
    });
  }
}
