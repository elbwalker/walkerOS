import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserBox } from '../src/components/organisms/browser-box';
import '../src/styles/layout.css';

const sampleHtml = `<div data-elb="product" data-elbaction="load:view">
  <h1 data-elb-product="name:#innerText">Product Name</h1>
  <p data-elb-product="price:99.99">$99.99</p>
  <button data-elbaction="click:add">Add to Cart</button>
</div>`;

const sampleCss = `body {
  font-family: system-ui, sans-serif;
  padding: 2rem;
}

h1 {
  color: #333;
  margin-bottom: 1rem;
}

button {
  background: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}`;

const sampleJs = `// Initialize walkerOS
elb('walker init', {
  on: {
    event: (event) => {
      console.log('Event:', event);
    }
  }
});`;

function App() {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
  const [html, setHtml] = React.useState(sampleHtml);
  const [css, setCss] = React.useState(sampleCss);
  const [js, setJs] = React.useState(sampleJs);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1 style={{ margin: 0, marginBottom: '0.5rem' }}>BrowserBox Demo</h1>
          <p style={{ margin: 0, color: theme === 'dark' ? '#ccc' : '#666' }}>
            Modular code editor with HTML/CSS/JS toggle buttons
          </p>
        </div>
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1rem',
        }}
      >
        <BrowserBox
          html={html}
          css={css}
          js={js}
          onHtmlChange={setHtml}
          onCssChange={setCss}
          onJsChange={setJs}
          label="All Tabs (Editable)"
          theme={theme}
        />

        <BrowserBox
          html={sampleHtml}
          css={sampleCss}
          label="HTML & CSS Only (Read-only)"
          theme={theme}
        />

        <BrowserBox js={sampleJs} label="JS Only" theme={theme} />

        <BrowserBox
          html={sampleHtml}
          label="HTML Only (Read-only)"
          theme={theme}
          initialTab="html"
        />
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
