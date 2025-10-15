import React from 'react';
import { createRoot } from 'react-dom/client';
import { DestinationDemo } from '../src/components/demos/DestinationDemo';
import {
  mockDestination,
  exampleMapping,
  exampleEvent,
  captureDestinationOutput,
} from './mocks/destination';

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
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <h1 style={{ margin: 0 }}>walkerOS Explorer - Destination Demos</h1>
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
      </div>

      <section style={{ marginBottom: '3rem' }}>
        <h2>Example Destination Demo</h2>
        <p
          style={{
            marginBottom: '1rem',
            color: theme === 'dark' ? '#cccccc' : '#666',
          }}
        >
          This demonstrates how DestinationDemo works with a mock destination.
          The component intercepts function calls from the destination's push
          method and displays them. In production, the website would import real
          destinations (like Plausible, Meta Pixel, etc.) and pass them to this
          component.
        </p>
        <DestinationDemo
          destination={mockDestination}
          event={exampleEvent}
          mapping={exampleMapping}
          fn={captureDestinationOutput}
          generic={true}
          theme={theme}
        />
      </section>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
