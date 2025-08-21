/**
 * Theme System
 * CSS variables and theming utilities
 */

import type { ThemeOptions } from '../types';

/**
 * Default theme variables
 */
export const defaultTheme = {
  // Colors - Light Theme
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

    // Dark theme variants
    darkBg: '#0a0a0a',
    darkFg: '#fafafa',
    darkBorder: '#27272a',
    darkAccent: '#3b82f6',
    darkSurface: '#18181b',
    darkHover: '#27272a',
    darkMuted: '#a1a1aa',
  },

  // Syntax highlighting colors
  syntax: {
    keyword: '#d73a49',
    string: '#032f62',
    number: '#005cc5',
    comment: '#6a737d',
    function: '#6f42c1',
    operator: '#d73a49',
    punctuation: '#24292e',

    // Dark mode syntax
    darkKeyword: '#f97583',
    darkString: '#9ecbff',
    darkNumber: '#79b8ff',
    darkComment: '#959da5',
    darkFunction: '#b392f0',
    darkOperator: '#f97583',
    darkPunctuation: '#f1f8ff',
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
 * Generate CSS variables from theme
 */
export function generateCSSVariables(theme = defaultTheme): string {
  const vars: string[] = [];

  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    vars.push(`--elb-${camelToKebab(key)}: ${value};`);
  });

  // Syntax colors
  Object.entries(theme.syntax).forEach(([key, value]) => {
    vars.push(`--elb-syntax-${camelToKebab(key)}: ${value};`);
  });

  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    vars.push(`--elb-spacing-${key}: ${value};`);
  });

  // Fonts
  Object.entries(theme.fonts).forEach(([key, value]) => {
    vars.push(`--elb-font-${key}: ${value};`);
  });

  // Font sizes
  Object.entries(theme.fontSize).forEach(([key, value]) => {
    vars.push(`--elb-font-size-${key}: ${value};`);
  });

  // Border radius
  Object.entries(theme.radius).forEach(([key, value]) => {
    vars.push(`--elb-radius-${key}: ${value};`);
  });

  // Shadows
  Object.entries(theme.shadow).forEach(([key, value]) => {
    vars.push(`--elb-shadow-${key}: ${value};`);
  });

  // Transitions
  Object.entries(theme.transition).forEach(([key, value]) => {
    vars.push(`--elb-transition-${key}: ${value};`);
  });

  return vars.join('\n  ');
}

// Component styles are embedded directly in getCompleteStyles function

/**
 * Get base styles for components with centralized component CSS
 */
export function getBaseStyles(textSize?: 'small' | 'regular'): string {
  const fontSize =
    textSize === 'small'
      ? 'var(--elb-font-size-sm)'
      : 'var(--elb-font-size-base)';

  return `
    :host {
      ${generateCSSVariables()}
      
      /* Override with global theme variables that inherit from parent document */
      --elb-bg: var(--walker-bg, #fafafa);
      --elb-fg: var(--walker-fg, #0a0a0a);
      --elb-border: var(--walker-border, #e4e4e7);
      --elb-accent: var(--walker-accent, #2563eb);
      --elb-error: var(--walker-error, #dc2626);
      --elb-success: var(--walker-success, #16a34a);
      --elb-warning: var(--walker-warning, #d97706);
      --elb-muted: var(--walker-muted, #71717a);
      --elb-surface: var(--walker-surface, #ffffff);
      --elb-hover: var(--walker-hover, #f4f4f5);
      
      /* Syntax colors from global theme with proper fallbacks */
      --elb-syntax-keyword: var(--walker-syntax-keyword, #d73a49);
      --elb-syntax-string: var(--walker-syntax-string, #032f62);
      --elb-syntax-number: var(--walker-syntax-number, #005cc5);
      --elb-syntax-comment: var(--walker-syntax-comment, #6a737d);
      --elb-syntax-function: var(--walker-syntax-function, #6f42c1);
      --elb-syntax-operator: var(--walker-syntax-operator, #d73a49);
      --elb-syntax-punctuation: var(--walker-syntax-punctuation, #24292e);
      
      /* Default styles */
      font-family: var(--elb-font-sans);
      font-size: ${fontSize};
      line-height: 1.5;
      color: var(--elb-fg);
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
