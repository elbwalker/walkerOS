/**
 * Theme System - Tailwind-compatible theming with CSS variables
 *
 * Features:
 * - Automatic light/dark mode detection
 * - Tailwind CSS variable integration
 * - Fallback values for standalone use
 * - Dynamic theme switching
 * - CSS injection without external files
 */

export interface ThemeConfig {
  light: ThemeColors;
  dark: ThemeColors;
}

export interface ThemeColors {
  // Background colors
  bg: {
    primary: string;
    secondary: string;
    tertiary: string;
    elevated: string;
  };

  // Text colors
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };

  // Border colors
  border: {
    primary: string;
    secondary: string;
    focus: string;
    error: string;
  };

  // Interactive colors
  interactive: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    hover: string;
  };

  // Code syntax colors
  syntax: {
    keyword: string;
    string: string;
    number: string;
    comment: string;
    tag: string;
    attribute: string;
    value: string;
  };
}

/**
 * Default theme configuration with Tailwind compatibility
 */
export const defaultTheme: ThemeConfig = {
  light: {
    bg: {
      primary: 'var(--tw-bg-white, #ffffff)',
      secondary: 'var(--tw-bg-gray-50, #f9fafb)',
      tertiary: 'var(--tw-bg-gray-100, #f3f4f6)',
      elevated: 'var(--tw-bg-white, #ffffff)',
    },
    text: {
      primary: 'var(--tw-text-gray-900, #111827)',
      secondary: 'var(--tw-text-gray-700, #374151)',
      muted: 'var(--tw-text-gray-500, #6b7280)',
      inverse: 'var(--tw-text-white, #ffffff)',
    },
    border: {
      primary: 'var(--tw-border-gray-200, #e5e7eb)',
      secondary: 'var(--tw-border-gray-300, #d1d5db)',
      focus: 'var(--tw-border-blue-500, #3b82f6)',
      error: 'var(--tw-border-red-500, #ef4444)',
    },
    interactive: {
      primary: 'var(--tw-bg-blue-500, #3b82f6)',
      secondary: 'var(--tw-bg-gray-200, #e5e7eb)',
      success: 'var(--tw-bg-green-500, #10b981)',
      warning: 'var(--tw-bg-yellow-500, #f59e0b)',
      error: 'var(--tw-bg-red-500, #ef4444)',
      hover: 'var(--tw-bg-gray-100, #f3f4f6)',
    },
    syntax: {
      keyword: 'var(--tw-text-purple-600, #9333ea)',
      string: 'var(--tw-text-green-600, #059669)',
      number: 'var(--tw-text-blue-600, #2563eb)',
      comment: 'var(--tw-text-gray-500, #6b7280)',
      tag: 'var(--tw-text-blue-600, #2563eb)',
      attribute: 'var(--tw-text-purple-600, #9333ea)',
      value: 'var(--tw-text-green-600, #059669)',
    },
  },
  dark: {
    bg: {
      primary: 'var(--tw-bg-gray-900, #111827)',
      secondary: 'var(--tw-bg-gray-800, #1f2937)',
      tertiary: 'var(--tw-bg-gray-700, #374151)',
      elevated: 'var(--tw-bg-gray-800, #1f2937)',
    },
    text: {
      primary: 'var(--tw-text-gray-100, #f3f4f6)',
      secondary: 'var(--tw-text-gray-300, #d1d5db)',
      muted: 'var(--tw-text-gray-400, #9ca3af)',
      inverse: 'var(--tw-text-gray-900, #111827)',
    },
    border: {
      primary: 'var(--tw-border-gray-700, #374151)',
      secondary: 'var(--tw-border-gray-600, #4b5563)',
      focus: 'var(--tw-border-blue-400, #60a5fa)',
      error: 'var(--tw-border-red-400, #f87171)',
    },
    interactive: {
      primary: 'var(--tw-bg-blue-600, #2563eb)',
      secondary: 'var(--tw-bg-gray-700, #374151)',
      success: 'var(--tw-bg-green-600, #059669)',
      warning: 'var(--tw-bg-yellow-600, #d97706)',
      error: 'var(--tw-bg-red-600, #dc2626)',
      hover: 'var(--tw-bg-gray-700, #374151)',
    },
    syntax: {
      keyword: 'var(--tw-text-purple-400, #c084fc)',
      string: 'var(--tw-text-green-400, #34d399)',
      number: 'var(--tw-text-blue-400, #60a5fa)',
      comment: 'var(--tw-text-gray-400, #9ca3af)',
      tag: 'var(--tw-text-blue-400, #60a5fa)',
      attribute: 'var(--tw-text-purple-400, #c084fc)',
      value: 'var(--tw-text-green-400, #34d399)',
    },
  },
};

/**
 * Generate CSS string from theme colors
 */
function generateCSSVariables(
  colors: ThemeColors,
  prefix = 'explorer',
): string {
  const cssVars: string[] = [];

  // Helper to flatten nested objects
  const flatten = (obj: any, parentKey = ''): void => {
    Object.entries(obj).forEach(([key, value]) => {
      const cssKey = parentKey ? `${parentKey}-${key}` : key;

      if (typeof value === 'object' && value !== null) {
        flatten(value, cssKey);
      } else {
        cssVars.push(`  --${prefix}-${cssKey}: ${value};`);
      }
    });
  };

  flatten(colors);
  return cssVars.join('\n');
}

/**
 * Get complete theme CSS with both light and dark variants
 */
export function getThemeCSS(theme: ThemeConfig = defaultTheme): string {
  return `
/* WalkerOS Explorer Theme Variables */
:root {
${generateCSSVariables(theme.light)}
}

[data-theme="dark"], 
.dark {
${generateCSSVariables(theme.dark)}
}

/* Auto theme detection */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${generateCSSVariables(theme.dark)}
  }
}

/* Component base styles */
[data-explorer-component] {
  /* CSS variables are available as --explorer-* */
  --color-bg-primary: var(--explorer-bg-primary);
  --color-bg-secondary: var(--explorer-bg-secondary);
  --color-text-primary: var(--explorer-text-primary);
  --color-text-secondary: var(--explorer-text-secondary);
  --color-border-primary: var(--explorer-border-primary);
  --color-interactive-primary: var(--explorer-interactive-primary);
  
  /* Default component styles */
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text-primary);
  background-color: var(--color-bg-primary);
}

[data-explorer-component] *,
[data-explorer-component] *::before,
[data-explorer-component] *::after {
  box-sizing: border-box;
}

/* Component utilities */
.explorer-button {
  background: var(--color-interactive-primary);
  color: var(--explorer-text-inverse);
  border: 1px solid var(--color-border-primary);
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.explorer-button:hover {
  background: var(--explorer-interactive-hover);
}

.explorer-button:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--color-border-focus)25;
}

.explorer-input {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.explorer-input:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--color-border-focus)25;
}

.explorer-code {
  font-family: 'Fira Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-primary);
  border-radius: 6px;
  padding: 12px;
  overflow: auto;
}

/* Syntax highlighting */
.syntax-keyword { color: var(--explorer-syntax-keyword); font-weight: 600; }
.syntax-string { color: var(--explorer-syntax-string); }
.syntax-number { color: var(--explorer-syntax-number); }
.syntax-comment { color: var(--explorer-syntax-comment); font-style: italic; }
.syntax-tag { color: var(--explorer-syntax-tag); font-weight: 600; }
.syntax-attribute { color: var(--explorer-syntax-attribute); }
.syntax-value { color: var(--explorer-syntax-value); }

/* Responsive utilities */
@media (max-width: 768px) {
  [data-explorer-component] {
    font-size: 13px;
  }
  
  .explorer-button {
    padding: 6px 12px;
    font-size: 13px;
  }
}
`;
}

/**
 * Inject theme CSS into document head
 */
let injectedStyleId: string | null = null;

export function injectThemeCSS(theme: ThemeConfig = defaultTheme): void {
  // Remove existing injected styles
  if (injectedStyleId) {
    const existingStyle = document.getElementById(injectedStyleId);
    if (existingStyle) {
      existingStyle.remove();
    }
  }

  // Create new style element
  const styleElement = document.createElement('style');
  injectedStyleId = `explorer-theme-${Date.now()}`;
  styleElement.id = injectedStyleId;
  styleElement.textContent = getThemeCSS(theme);

  // Insert into head
  document.head.appendChild(styleElement);
}

/**
 * Detect current theme from environment
 */
export function detectCurrentTheme(): 'light' | 'dark' {
  // Check document class/attribute
  if (document.documentElement.classList.contains('dark')) {
    return 'dark';
  }

  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    return 'dark';
  }

  // Check system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

/**
 * Watch for theme changes and notify callback
 */
export function watchThemeChanges(
  callback: (theme: 'light' | 'dark') => void,
): () => void {
  const cleanup: Array<() => void> = [];

  // Watch document changes
  const observer = new MutationObserver(() => {
    callback(detectCurrentTheme());
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });

  cleanup.push(() => observer.disconnect());

  // Watch system preference changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleMediaChange = () => callback(detectCurrentTheme());

  mediaQuery.addEventListener('change', handleMediaChange);
  cleanup.push(() =>
    mediaQuery.removeEventListener('change', handleMediaChange),
  );

  // Return cleanup function
  return () => cleanup.forEach((fn) => fn());
}

/**
 * Get theme colors for current theme
 */
export function getCurrentThemeColors(
  theme: ThemeConfig = defaultTheme,
): ThemeColors {
  const currentTheme = detectCurrentTheme();
  return theme[currentTheme];
}
