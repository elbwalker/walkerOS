import React from 'react';
import { createRoot } from 'react-dom/client';
import { MappingBox } from '../src/components/organisms/mapping-box';
import '../src/styles/index.css';
import './demo.css';

// GA4 mapping example from packages/web/destinations/gtag/src/examples/mapping.ts
const ga4Mapping = {
  page: {
    view: {
      name: 'page_view',
      data: {
        map: {
          page_title: 'data.title',
          page_location: 'data.url',
        },
      },
    },
  },
  product: {
    view: {
      name: 'view_item',
      settings: {
        ga4: {
          include: ['data'],
        },
      },
      data: {
        map: {
          currency: { value: 'USD', key: 'data.currency' },
          value: 'data.price',
          items: {
            loop: [
              'this',
              {
                map: {
                  item_id: 'data.id',
                  item_name: 'data.name',
                  item_category: 'data.category',
                },
              },
            ],
          },
        },
      },
    },
    add: {
      name: 'add_to_cart',
      settings: {
        ga4: {
          include: ['data'],
        },
      },
      data: {
        map: {
          currency: { value: 'USD', key: 'data.currency' },
          value: 'data.price',
          items: {
            loop: [
              'this',
              {
                map: {
                  item_id: 'data.id',
                  item_variant: 'data.color',
                  quantity: { value: 1, key: 'data.quantity' },
                },
              },
            ],
          },
        },
      },
    },
  },
  order: {
    complete: {
      name: 'purchase',
      settings: {
        ga4: {
          include: ['data', 'context'],
        },
      },
      data: {
        map: {
          transaction_id: 'data.id',
          value: 'data.total',
          tax: 'data.taxes',
          shipping: 'data.shipping',
          currency: { key: 'data.currency', value: 'USD' },
          items: {
            loop: [
              'nested',
              {
                map: {
                  item_id: 'data.id',
                  item_name: 'data.name',
                  quantity: { key: 'data.quantity', value: 1 },
                },
              },
            ],
          },
        },
      },
    },
  },
};

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

  const [editableMapping, setEditableMapping] = React.useState(ga4Mapping);

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
          <h1 className="demo-title">MappingBox Demo</h1>
          <p className="demo-subtitle">
            New tabbed editor with tree navigation vs. original dropdown editor
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

      <div className="demo-section">
        <h2>GA4 Mapping - New Layout</h2>
        <p className="demo-section-description">
          New tabbed editor with tree sidebar, breadcrumb navigation, and
          pane-based editing
        </p>
        <MappingBox
          mapping={editableMapping}
          onMappingChange={setEditableMapping}
          label="GA4 E-Commerce Mapping (New Layout)"
          initialTab="editor"
          resizable
          useNewEditor
        />
      </div>

      <div className="demo-section">
        <h2>GA4 Mapping - Old Layout (For Comparison)</h2>
        <p className="demo-section-description">
          Original autocomplete dropdown editor for comparison
        </p>
        <MappingBox
          mapping={editableMapping}
          onMappingChange={setEditableMapping}
          label="GA4 E-Commerce Mapping (Old Layout)"
          initialTab="editor"
          resizable
        />
      </div>

      <div className="demo-section">
        <h2>New Editor Features</h2>
        <ul className="demo-feature-list">
          <li>
            <strong>Tree Sidebar:</strong> Hierarchical view of all entities,
            actions, and rules
          </li>
          <li>
            <strong>Multi-Tab Navigation:</strong> Open multiple rules/values
            simultaneously with tabs
          </li>
          <li>
            <strong>Breadcrumb Trail:</strong> Navigate back through nested
            levels
          </li>
          <li>
            <strong>Pane-Based Editing:</strong> Specialized editors for rules,
            maps, loops, and value configs
          </li>
          <li>
            <strong>Type Selector:</strong> Choose value types (key, value, map,
            loop, function, set)
          </li>
          <li>
            <strong>Responsive Layout:</strong> Adapts to compact/medium/wide
            screens
          </li>
          <li>
            <strong>Theme Support:</strong> Full light/dark theme compatibility
          </li>
          <li>
            <strong>Code View:</strong> Toggle to JSON with syntax highlighting
          </li>
        </ul>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
