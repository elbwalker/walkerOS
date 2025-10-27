import React from 'react';
import '../../src/styles/index.scss';
import '../demo.css';

export interface DemoTemplateProps {
  title: string;
  componentName: string;
  description: string;
  children: React.ReactNode;
}

export function DemoTemplate({
  title,
  componentName,
  description,
  children,
}: DemoTemplateProps) {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
    return 'light';
  });

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="demo-container">
      <div className="demo-header">
        <div>
          <div style={{ marginBottom: '0.5rem' }}>
            <a
              href="/"
              style={{
                color: theme === 'dark' ? '#58a6ff' : '#0969da',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              ← Back to Home
            </a>
          </div>
          <h1 className="demo-title">{title}</h1>
          <p
            className="demo-subtitle"
            style={{ color: theme === 'dark' ? '#8b949e' : '#57606a' }}
          >
            <code
              style={{
                padding: '0.125rem 0.375rem',
                borderRadius: '3px',
                background: theme === 'dark' ? '#161b22' : '#f6f8fa',
                fontSize: '0.875em',
              }}
            >
              {componentName}
            </code>{' '}
            - {description}
          </p>
        </div>
        <button
          onClick={toggleTheme}
          className="demo-theme-toggle"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </div>

      <div className="demo-dual-view">
        <div className="demo-view-desktop">
          <div className="demo-view-label">Desktop View</div>
          <div className="demo-view-content">{children}</div>
        </div>
        <div className="demo-view-mobile">
          <div className="demo-view-label">Mobile View (375px)</div>
          <div className="demo-view-content">{children}</div>
        </div>
      </div>
    </div>
  );
}
