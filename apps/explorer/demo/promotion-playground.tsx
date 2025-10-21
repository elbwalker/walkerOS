import React from 'react';
import { createRoot } from 'react-dom/client';
import { PromotionPlayground } from '../src/components/demos/PromotionPlayground';
import '../src/styles/index.scss';
import './demo.css';

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
    <div className="demo-container">
      <div className="demo-header">
        <div>
          <h1 className="demo-title">walkerOS Promotion Playground</h1>
          <p className="demo-subtitle">
            Interactive demo showing the complete walkerOS flow: HTML → Preview
            → Events → Mapping → Destination
          </p>
        </div>
        <div className="demo-header-actions">
          <a href="/" className="demo-header-link">
            Home
          </a>
          <a href="/mapping.html" className="demo-header-link">
            Mapping
          </a>
          <a href="/destination.html" className="demo-header-link">
            Destination
          </a>
          <button onClick={toggleTheme} className="demo-theme-toggle">
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </div>

      <section className="demo-section">
        <h2>How to Use</h2>
        <ul className="demo-instruction-list">
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
