import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/styles/index.css';
import './demo.css';

const App = () => {
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
          <h1 className="demo-title">walkerOS Explorer</h1>
          <p className="demo-subtitle">
            Interactive demos and testing tools for walkerOS
          </p>
        </div>
        <button
          onClick={toggleTheme}
          className="demo-theme-toggle"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>

      <div className="demo-grid">
        <a href="/mapping.html" className="demo-card">
          <h2 className="demo-card-title">Mapping Demos</h2>
          <p className="demo-card-description">
            Interactive mapping transformation examples
          </p>
          <ul className="demo-card-list">
            <li>MappingCode - Execute code with built-in functions</li>
            <li>MappingDemo - Custom transformation functions</li>
            <li>Live editing with Monaco Editor</li>
          </ul>
        </a>

        <a href="/destination.html" className="demo-card">
          <h2 className="demo-card-title">Destination Demos</h2>
          <p className="demo-card-description">
            Test destination integrations with real examples
          </p>
          <ul className="demo-card-list">
            <li>Plausible Analytics integration</li>
            <li>Function call interception</li>
            <li>Live mapping transformations</li>
          </ul>
        </a>

        <a href="/preview.html" className="demo-card">
          <h2 className="demo-card-title">HTML Preview</h2>
          <p className="demo-card-description">
            Interactive HTML preview with data attribute highlighting
          </p>
          <ul className="demo-card-list">
            <li>Render HTML with live preview</li>
            <li>Highlight walkerOS data attributes</li>
            <li>Auto-mark entity properties</li>
          </ul>
        </a>

        <a href="/playground.html" className="demo-card">
          <h2 className="demo-card-title">Promotion Playground</h2>
          <p className="demo-card-description">
            Complete walkerOS flow demonstration
          </p>
          <ul className="demo-card-list">
            <li>HTML editor → preview chain</li>
            <li>Event generation → mapping</li>
            <li>Destination output visualization</li>
          </ul>
        </a>

        <a href="/browser-box-demo.html" className="demo-card">
          <h2 className="demo-card-title">BrowserBox Demo</h2>
          <p className="demo-card-description">
            Modular code editor with HTML/CSS/JS toggle buttons
          </p>
          <ul className="demo-card-list">
            <li>Atomic design: HeaderButton + ButtonGroup</li>
            <li>Dynamic tab visibility</li>
            <li>Clean API with Box composition</li>
            <li>Multiple configuration examples</li>
          </ul>
        </a>

        <a href="/code.html" className="demo-card">
          <h2 className="demo-card-title">Code Component</h2>
          <p className="demo-card-description">
            Static code examples with syntax highlighting
          </p>
          <ul className="demo-card-list">
            <li>Read-only code display</li>
            <li>Multiple language support</li>
            <li>Copy to clipboard functionality</li>
            <li>Perfect for documentation examples</li>
          </ul>
        </a>
      </div>

      <footer className="demo-footer">
        <p className="demo-footer-text">
          <a
            href="https://github.com/elbwalker/walkerOS"
            target="_blank"
            rel="noopener noreferrer"
            className="demo-footer-link"
          >
            walkerOS
          </a>{' '}
          - Privacy-first event data collection
        </p>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
