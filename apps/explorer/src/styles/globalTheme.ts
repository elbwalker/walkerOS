/**
 * Global Theme Styles
 * Injects theme CSS variables into the document for Shadow DOM inheritance
 */

/**
 * Inject global theme styles into document head
 * This allows Shadow DOM components to inherit theme variables
 */
export function injectGlobalThemeStyles(): void {
  // Check if already injected
  if (document.getElementById('walker-explorer-global-theme')) {
    return;
  }

  const styles = document.createElement('style');
  styles.id = 'walker-explorer-global-theme';
  styles.textContent = `
    /* Global theme variables that cascade into Shadow DOM */
    :root, [data-theme="light"] {
      /* Light theme colors */
      --walker-bg: #fafafa;
      --walker-fg: #0a0a0a;
      --walker-border: #e4e4e7;
      --walker-accent: #2563eb;
      --walker-error: #dc2626;
      --walker-success: #16a34a;
      --walker-warning: #d97706;
      --walker-muted: #71717a;
      --walker-surface: #ffffff;
      --walker-hover: #f4f4f5;
      
      /* Light syntax colors */
      --walker-syntax-keyword: #d73a49;
      --walker-syntax-string: #032f62;
      --walker-syntax-number: #005cc5;
      --walker-syntax-comment: #6a737d;
      --walker-syntax-function: #6f42c1;
      --walker-syntax-operator: #d73a49;
      --walker-syntax-punctuation: #24292e;
    }
    
    [data-theme="dark"] {
      /* Dark theme colors */
      --walker-bg: #0a0a0a;
      --walker-fg: #fafafa;
      --walker-border: #27272a;
      --walker-accent: #3b82f6;
      --walker-error: #dc2626;
      --walker-success: #16a34a;
      --walker-warning: #d97706;
      --walker-muted: #a1a1aa;
      --walker-surface: #18181b;
      --walker-hover: #27272a;
      
      /* Dark syntax colors */
      --walker-syntax-keyword: #f97583;
      --walker-syntax-string: #9ecbff;
      --walker-syntax-number: #79b8ff;
      --walker-syntax-comment: #959da5;
      --walker-syntax-function: #b392f0;
      --walker-syntax-operator: #f97583;
      --walker-syntax-punctuation: #f1f8ff;
    }
    
    /* Also support prefers-color-scheme */
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        /* Dark theme colors */
        --walker-bg: #0a0a0a;
        --walker-fg: #fafafa;
        --walker-border: #27272a;
        --walker-accent: #3b82f6;
        --walker-error: #dc2626;
        --walker-success: #16a34a;
        --walker-warning: #d97706;
        --walker-muted: #a1a1aa;
        --walker-surface: #18181b;
        --walker-hover: #27272a;
        
        /* Dark syntax colors */
        --walker-syntax-keyword: #f97583;
        --walker-syntax-string: #9ecbff;
        --walker-syntax-number: #79b8ff;
        --walker-syntax-comment: #959da5;
        --walker-syntax-function: #b392f0;
        --walker-syntax-operator: #f97583;
        --walker-syntax-punctuation: #f1f8ff;
      }
    }
  `;

  document.head.appendChild(styles);
}
