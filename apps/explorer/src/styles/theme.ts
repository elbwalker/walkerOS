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
    bg: '#ffffff',
    fg: '#1f2937',
    border: '#e5e7eb',
    accent: '#3b82f6',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    muted: '#6b7280',

    // Dark theme variants
    darkBg: '#1f2937',
    darkFg: '#f9fafb',
    darkBorder: '#374151',
    darkAccent: '#60a5fa',
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

  // Spacing
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },

  // Typography
  fonts: {
    mono: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
    sans: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },

  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
  },

  // Layout
  radius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
  },

  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
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

/**
 * Get base styles for components
 */
export function getBaseStyles(): string {
  return `
    :host {
      ${generateCSSVariables()}
      
      /* Default styles */
      font-family: var(--elb-font-sans);
      font-size: var(--elb-font-size-base);
      line-height: 1.5;
      color: var(--elb-fg);
      background-color: var(--elb-bg);
    }
    
    /* Dark mode auto-detection */
    @media (prefers-color-scheme: dark) {
      :host(:not([data-theme="light"])) {
        --elb-bg: var(--elb-dark-bg);
        --elb-fg: var(--elb-dark-fg);
        --elb-border: var(--elb-dark-border);
        --elb-accent: var(--elb-dark-accent);
        
        /* Dark syntax colors */
        --elb-syntax-keyword: var(--elb-syntax-dark-keyword);
        --elb-syntax-string: var(--elb-syntax-dark-string);
        --elb-syntax-number: var(--elb-syntax-dark-number);
        --elb-syntax-comment: var(--elb-syntax-dark-comment);
        --elb-syntax-function: var(--elb-syntax-dark-function);
        --elb-syntax-operator: var(--elb-syntax-dark-operator);
        --elb-syntax-punctuation: var(--elb-syntax-dark-punctuation);
      }
    }
    
    /* Explicit dark theme */
    :host([data-theme="dark"]) {
      --elb-bg: var(--elb-dark-bg);
      --elb-fg: var(--elb-dark-fg);
      --elb-border: var(--elb-dark-border);
      --elb-accent: var(--elb-dark-accent);
      
      /* Dark syntax colors */
      --elb-syntax-keyword: var(--elb-syntax-dark-keyword);
      --elb-syntax-string: var(--elb-syntax-dark-string);
      --elb-syntax-number: var(--elb-syntax-dark-number);
      --elb-syntax-comment: var(--elb-syntax-dark-comment);
      --elb-syntax-function: var(--elb-syntax-dark-function);
      --elb-syntax-operator: var(--elb-syntax-dark-operator);
      --elb-syntax-punctuation: var(--elb-syntax-dark-punctuation);
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
