import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { CodeToggleBox } from '../src/components/molecules/code-toggle-box';

// Sample content
const sampleHtml = `<div data-elb="product" data-elbaction="load:view" class="product-card">
  <h3 data-elb-product="name:#innerText">Everyday Ruck Snack</h3>
  <p data-elb-product="price:2.50">€ 2.50</p>
  <button data-elbaction="click:add">Add to Cart</button>
</div>`;

const sampleCss = `.product-card {
  width: 300px;
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.product-card h3 {
  margin: 0 0 8px 0;
  color: #1f2937;
}

.product-card p {
  margin: 0 0 16px 0;
  font-size: 1.25rem;
  font-weight: bold;
}

.product-card button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}`;

const sampleJs = `// walkerOS Event Handler
function handleProductEvent(event) {
  console.log('Product event:', event);
  
  if (event.action === 'click:add') {
    addToCart(event.data);
  }
}

// Initialize walkerOS
elb('walker init', {
  on: { event: handleProductEvent }
});

function addToCart(data) {
  console.log('Adding to cart:', data);
}`;

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

  // State for different demos
  const [activeTab1, setActiveTab1] = React.useState('HTML');
  const [activeTab2, setActiveTab2] = React.useState('CSS');
  const [activeTab3, setActiveTab3] = React.useState('JS');

  // Content state
  const [htmlContent, setHtmlContent] = React.useState(sampleHtml);
  const [cssContent, setCssContent] = React.useState(sampleCss);
  const [jsContent, setJsContent] = React.useState(sampleJs);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

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
          <h1 style={{ margin: 0, marginBottom: '0.5rem' }}>
            Manual Live Demo
          </h1>
          <p
            style={{ margin: 0, color: theme === 'dark' ? '#cccccc' : '#666' }}
          >
            Segmented Control with configurable tabs and Monaco Editor
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
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Demo 1: All tabs */}
        <div>
          <h2 style={{ marginBottom: '1rem' }}>All Tabs (HTML, CSS, JS)</h2>
          <CodeToggleBox
            header="Complete Editor"
            activeTab={activeTab1}
            onTabChange={setActiveTab1}
            htmlContent={htmlContent}
            cssContent={cssContent}
            jsContent={jsContent}
            onHtmlChange={setHtmlContent}
            onCssChange={setCssContent}
            onJsChange={setJsContent}
            theme={theme}
          />
        </div>

        {/* Demo 2: Only CSS and JS */}
        <div>
          <h2 style={{ marginBottom: '1rem' }}>CSS and JS Only</h2>
          <CodeToggleBox
            header="Styles & Scripts"
            activeTab={activeTab2}
            onTabChange={setActiveTab2}
            cssContent={cssContent}
            jsContent={jsContent}
            showHTML={false}
            onCssChange={setCssContent}
            onJsChange={setJsContent}
            theme={theme}
          />
        </div>

        {/* Demo 3: Only HTML (read-only) */}
        <div>
          <h2 style={{ marginBottom: '1rem' }}>HTML Only (Read-only)</h2>
          <CodeToggleBox
            header="HTML Template"
            activeTab={activeTab3}
            onTabChange={setActiveTab3}
            htmlContent={htmlContent}
            showCSS={false}
            showJS={false}
            theme={theme}
          />
        </div>

        {/* Demo 4: Only JS */}
        <div>
          <h2 style={{ marginBottom: '1rem' }}>JavaScript Only</h2>
          <CodeToggleBox
            header="JavaScript Code"
            activeTab="JS"
            onTabChange={() => {}}
            jsContent={jsContent}
            showHTML={false}
            showCSS={false}
            onJsChange={setJsContent}
            theme={theme}
          />
        </div>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
