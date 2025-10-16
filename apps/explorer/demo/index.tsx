import React from 'react';
import { createRoot } from 'react-dom/client';

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

  const cardStyle: React.CSSProperties = {
    border: theme === 'dark' ? '1px solid #3c3c3c' : '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '2rem',
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
    transition: 'all 0.2s',
    background: theme === 'dark' ? '#252526' : '#f9f9f9',
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '3rem',
        }}
      >
        <div>
          <h1 style={{ margin: 0, marginBottom: '0.5rem' }}>
            walkerOS Explorer
          </h1>
          <p
            style={{ margin: 0, color: theme === 'dark' ? '#cccccc' : '#666' }}
          >
            Interactive demos and testing tools for walkerOS
          </p>
        </div>
        <button
          onClick={toggleTheme}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
        }}
      >
        <a
          href="/mapping.html"
          style={cardStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow =
              theme === 'dark'
                ? '0 8px 16px rgba(0,0,0,0.4)'
                : '0 8px 16px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Mapping Demos</h2>
          <p
            style={{
              color: theme === 'dark' ? '#b3b3b3' : '#666',
              marginBottom: '1rem',
            }}
          >
            Interactive mapping transformation examples
          </p>
          <ul
            style={{
              paddingLeft: '1.5rem',
              margin: 0,
              color: theme === 'dark' ? '#b3b3b3' : '#666',
            }}
          >
            <li>MappingCode - Execute code with built-in functions</li>
            <li>MappingDemo - Custom transformation functions</li>
            <li>Live editing with Monaco Editor</li>
          </ul>
        </a>

        <a
          href="/destination.html"
          style={cardStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow =
              theme === 'dark'
                ? '0 8px 16px rgba(0,0,0,0.4)'
                : '0 8px 16px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>
            Destination Demos
          </h2>
          <p
            style={{
              color: theme === 'dark' ? '#b3b3b3' : '#666',
              marginBottom: '1rem',
            }}
          >
            Test destination integrations with real examples
          </p>
          <ul
            style={{
              paddingLeft: '1.5rem',
              margin: 0,
              color: theme === 'dark' ? '#b3b3b3' : '#666',
            }}
          >
            <li>Plausible Analytics integration</li>
            <li>Function call interception</li>
            <li>Live mapping transformations</li>
          </ul>
        </a>

        <a
          href="/preview.html"
          style={cardStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow =
              theme === 'dark'
                ? '0 8px 16px rgba(0,0,0,0.4)'
                : '0 8px 16px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>HTML Preview</h2>
          <p
            style={{
              color: theme === 'dark' ? '#b3b3b3' : '#666',
              marginBottom: '1rem',
            }}
          >
            Interactive HTML preview with data attribute highlighting
          </p>
          <ul
            style={{
              paddingLeft: '1.5rem',
              margin: 0,
              color: theme === 'dark' ? '#b3b3b3' : '#666',
            }}
          >
            <li>Render HTML with live preview</li>
            <li>Highlight walkerOS data attributes</li>
            <li>Auto-mark entity properties</li>
          </ul>
        </a>

        <a
          href="/playground.html"
          style={cardStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow =
              theme === 'dark'
                ? '0 8px 16px rgba(0,0,0,0.4)'
                : '0 8px 16px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>
            Promotion Playground
          </h2>
          <p
            style={{
              color: theme === 'dark' ? '#b3b3b3' : '#666',
              marginBottom: '1rem',
            }}
          >
            Complete walkerOS flow demonstration
          </p>
          <ul
            style={{
              paddingLeft: '1.5rem',
              margin: 0,
              color: theme === 'dark' ? '#b3b3b3' : '#666',
            }}
          >
            <li>HTML editor → preview chain</li>
            <li>Event generation → mapping</li>
            <li>Destination output visualization</li>
          </ul>
        </a>

        <a
          href="/browser-box-demo.html"
          style={cardStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow =
              theme === 'dark'
                ? '0 8px 16px rgba(0,0,0,0.4)'
                : '0 8px 16px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>
            BrowserBox Demo
          </h2>
          <p
            style={{
              color: theme === 'dark' ? '#b3b3b3' : '#666',
              marginBottom: '1rem',
            }}
          >
            Modular code editor with HTML/CSS/JS toggle buttons
          </p>
          <ul
            style={{
              paddingLeft: '1.5rem',
              margin: 0,
              color: theme === 'dark' ? '#b3b3b3' : '#666',
            }}
          >
            <li>Atomic design: HeaderButton + ButtonGroup</li>
            <li>Dynamic tab visibility</li>
            <li>Clean API with Box composition</li>
            <li>Multiple configuration examples</li>
          </ul>
        </a>
      </div>

      <footer
        style={{
          marginTop: '4rem',
          paddingTop: '2rem',
          borderTop:
            theme === 'dark' ? '1px solid #3c3c3c' : '1px solid #e0e0e0',
        }}
      >
        <p
          style={{
            color: theme === 'dark' ? '#b3b3b3' : '#888',
            textAlign: 'center',
          }}
        >
          <a
            href="https://github.com/elbwalker/walkerOS"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
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
