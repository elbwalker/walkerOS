import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/styles/index.scss';
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
            Interactive demos and testing tools for walkerOS components
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

      <div style={{ padding: '2rem' }}>
        <section style={{ marginBottom: '3rem' }}>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '1rem',
              color: theme === 'dark' ? '#ffffff' : '#1f2937',
            }}
          >
            Single Component Demos
          </h2>
          <div className="demo-grid">
            <a href="/code.html" className="demo-card">
              <h3 className="demo-card-title">CodeBox</h3>
              <p className="demo-card-description">
                Syntax-highlighted code viewer with Monaco editor
              </p>
            </a>

            <a href="/preview.html" className="demo-card">
              <h3 className="demo-card-title">Preview</h3>
              <p className="demo-card-description">
                Interactive HTML preview with data attribute highlighting
              </p>
            </a>
          </div>
        </section>

        <section>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '1rem',
              color: theme === 'dark' ? '#ffffff' : '#1f2937',
            }}
          >
            Grouped Component Demos
          </h2>
          <div className="demo-grid">
            <a href="/destination-box-demo.html" className="demo-card">
              <h3 className="demo-card-title">DestinationBox</h3>
              <p className="demo-card-description">
                Complete destination configuration editor with settings,
                mapping, data, policy, consent, and options
              </p>
            </a>

            <a href="/mapping-box-demo.html" className="demo-card">
              <h3 className="demo-card-title">MappingBox</h3>
              <p className="demo-card-description">
                Interactive mapping editor with schema validation and tree
                navigation
              </p>
            </a>

            <a href="/mapping.html" className="demo-card">
              <h3 className="demo-card-title">Mapping Transformation</h3>
              <p className="demo-card-description">
                Live mapping examples with custom transformation functions
              </p>
            </a>

            <a href="/playground.html" className="demo-card">
              <h3 className="demo-card-title">Playground</h3>
              <p className="demo-card-description">
                Complete walkerOS flow with HTML editor, preview, and event
                generation
              </p>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
