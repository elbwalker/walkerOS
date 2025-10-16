import React from 'react';
import { createRoot } from 'react-dom/client';
import { PromotionPlayground } from '../src/components/demos/PromotionPlayground';

function App() {
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
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>walkerOS Promotion Playground</h1>
          <p
            style={{
              margin: '0.5rem 0 0 0',
              color: theme === 'dark' ? '#aaa' : '#666',
            }}
          >
            Interactive demo showing the complete walkerOS flow: HTML → Preview
            → Events → Mapping → Destination
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            Home
          </a>
          <a
            href="/mapping.html"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            Mapping
          </a>
          <a
            href="/destination.html"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            Destination
          </a>
          <button
            onClick={toggleTheme}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              borderRadius: '6px',
              border: '1px solid #ccc',
              background: theme === 'dark' ? '#333' : '#fff',
              color: theme === 'dark' ? '#fff' : '#000',
            }}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </div>

      <section style={{ marginBottom: '2rem' }}>
        <h2>How to Use</h2>
        <ul
          style={{
            color: theme === 'dark' ? '#ccc' : '#666',
            lineHeight: '1.6',
          }}
        >
          <li>
            <strong>Edit HTML:</strong> Modify the HTML code with walkerOS data
            attributes (data-elb, data-elbaction, etc.)
          </li>
          <li>
            <strong>Preview:</strong> See your HTML rendered in real-time. Use
            the highlight buttons to visualize different attribute types.
          </li>
          <li>
            <strong>Events:</strong> Click elements in the preview to trigger
            events. They appear here.
          </li>
          <li>
            <strong>Mapping:</strong> Configure how events are transformed
            before reaching destinations.
          </li>
          <li>
            <strong>Destination Output:</strong> See the final function calls
            sent to analytics tools.
          </li>
        </ul>
      </section>

      <PromotionPlayground theme={theme} />
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
