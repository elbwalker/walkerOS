import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Box } from '../src/components/atoms/box';
import { Preview } from '../src/components/molecules/preview';

// Sample content for the three tabs
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

const sampleCss = `* {
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
}`;

const sampleJs = `// walkerOS Event Handler
function handleProductEvent(event) {
  console.log('Product event:', event);
  
  // Example: Track product interactions
  if (event.action === 'click:add') {
    // Add to cart logic
    addToCart(event.entity, event.data);
  } else if (event.action === 'click:save') {
    // Add to wishlist logic
    addToWishlist(event.entity, event.data);
  }
}

// Initialize walkerOS
elb('walker init', {
  on: {
    event: handleProductEvent
  }
});

// Helper functions
function addToCart(product, data) {
  const cart = getCart();
  cart.push({
    id: data.id,
    name: data.name,
    price: data.price,
    taste: data.taste
  });
  saveCart(cart);
  showNotification('Added to cart!');
}

function addToWishlist(product, data) {
  const wishlist = getWishlist();
  wishlist.push({
    id: data.id,
    name: data.name,
    price: data.price
  });
  saveWishlist(wishlist);
  showNotification('Added to wishlist!');
}`;

// Header Toggle Component - Style 1: Segmented Control
function SegmentedControlHeader({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const tabs = ['HTML', 'CSS', 'JS'];

  return (
    <div className="segmented-control-header">
      <div className="segmented-control">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`segmented-control-button ${activeTab === tab ? 'active' : ''}`}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

// Header Toggle Component - Style 2: Tab Pills
function TabPillsHeader({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const tabs = [
    { id: 'HTML', label: 'HTML', icon: '📄' },
    { id: 'CSS', label: 'CSS', icon: '🎨' },
    { id: 'JS', label: 'JS', icon: '⚡' },
  ];

  return (
    <div className="tab-pills-header">
      <div className="tab-pills">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-pill ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Header Toggle Component - Style 3: Minimal Toggle
function MinimalToggleHeader({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const tabs = ['HTML', 'CSS', 'JS'];

  return (
    <div className="minimal-toggle-header">
      <div className="minimal-toggle">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`minimal-toggle-button ${activeTab === tab ? 'active' : ''}`}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

// Content Display Component
function ContentDisplay({ activeTab }: { activeTab: string }) {
  const getContent = () => {
    switch (activeTab) {
      case 'HTML':
        return (
          <div className="code-content">
            <Preview html={sampleHtml} css={sampleCss} />
          </div>
        );
      case 'CSS':
        return (
          <div className="code-content">
            <pre className="code-block">
              <code>{sampleCss}</code>
            </pre>
          </div>
        );
      case 'JS':
        return (
          <div className="code-content">
            <pre className="code-block">
              <code>{sampleJs}</code>
            </pre>
          </div>
        );
      default:
        return null;
    }
  };

  return <div className="content-display">{getContent()}</div>;
}

// Demo Box Component with Custom Header
function DemoBox({
  title,
  headerComponent,
  activeTab,
  onTabChange,
}: {
  title: string;
  headerComponent: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  return (
    <div className="demo-box">
      <div className="demo-box-header">
        <h3 className="demo-box-title">{title}</h3>
        {headerComponent}
      </div>
      <div className="demo-box-content">
        <ContentDisplay activeTab={activeTab} />
      </div>
    </div>
  );
}

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

  const [activeTab, setActiveTab] = React.useState('HTML');

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
          marginBottom: '3rem',
        }}
      >
        <div>
          <h1 style={{ margin: 0, marginBottom: '0.5rem' }}>
            Header Toggle Styles Demo
          </h1>
          <p
            style={{ margin: 0, color: theme === 'dark' ? '#cccccc' : '#666' }}
          >
            Three different header styles for toggling between HTML, CSS, and JS
            content
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '2rem',
        }}
      >
        <DemoBox
          title="Style 1: Segmented Control"
          headerComponent={
            <SegmentedControlHeader
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          }
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <DemoBox
          title="Style 2: Tab Pills"
          headerComponent={
            <TabPillsHeader activeTab={activeTab} onTabChange={setActiveTab} />
          }
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <DemoBox
          title="Style 3: Minimal Toggle"
          headerComponent={
            <MinimalToggleHeader
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          }
          activeTab={activeTab}
          onTabChange={setActiveTab}
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
