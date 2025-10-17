import React from 'react';
import { createRoot } from 'react-dom/client';
import { Box } from '../src/components/atoms/box';
import { Preview } from '../src/components/molecules/preview';
import '../src/styles/layout.css';

const sampleHtml = `<div
  data-elb="product"
  data-elbaction="load:view"
  data-elbcontext="stage:inspire"
  class="product-card">
  <figure class="product-image">
    <div class="product-badge-container">
      <div data-elb-product="badge:delicious" class="product-badge">delicious</div>
    </div>
  </figure>
  <div class="product-body">
    <h3 data-elb-product="name:#innerText" class="product-title">
      Everyday Ruck Snack
    </h3>
    <div class="product-form-control">
      <label class="product-label">Taste</label>
      <select
        data-elb-product="taste:#value"
        class="product-select">
        <option value="sweet">Sweet</option>
        <option value="spicy">Spicy</option>
      </select>
    </div>
    <p data-elb-product="price:2.50" class="product-price">
      € 2.50 <span data-elb-product="old_price:3.14" class="product-old-price">€ 3.14</span>
    </p>
    <div data-elbcontext="stage:hooked" class="product-actions">
      <button data-elbaction="click:save" class="product-button product-button-secondary">
        Add to Wishlist
      </button>
      <button data-elbaction="click:add" class="product-button product-button-primary">
        Add to Cart
      </button>
    </div>
  </div>
</div>`;

const sampleCss = `
* {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.product-card {
  width: 288px;
  background: white;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  border-radius: 8px;
  overflow: hidden;
  margin: 0 auto;
}

.product-image {
  position: relative;
  height: 200px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  margin: 0;
}

.product-badge-container {
  position: absolute;
  top: 8px;
  right: 8px;
}

.product-badge {
  background: #5b21b6;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.product-body {
  padding: 16px;
}

.product-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #1f2937;
}

.product-form-control {
  margin-bottom: 16px;
}

.product-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 4px;
  color: #374151;
}

.product-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
}

.product-price {
  font-size: 1.25rem;
  font-weight: bold;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.product-old-price {
  font-size: 1rem;
  font-weight: normal;
  text-decoration: line-through;
  color: #6b7280;
}

.product-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.product-button {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.product-button-secondary {
  background: #8b5cf6;
  color: white;
}

.product-button-secondary:hover {
  background: #7c3aed;
}

.product-button-primary {
  background: #6366f1;
  color: white;
}

.product-button-primary:hover {
  background: #4f46e5;
}
`;

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
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <h1>HTML Preview Demo</h1>
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
      <Box header="Preview" className="preview-box-container">
        <Preview html={sampleHtml} css={sampleCss} theme={theme} />
      </Box>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
