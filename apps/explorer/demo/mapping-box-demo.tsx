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

// Simpler mapping for read-only example
const simplifiedMapping = {
  page: {
    view: {
      name: 'page_view',
    },
  },
  product: {
    view: {
      name: 'view_item',
      data: {
        map: {
          item_id: 'data.id',
          item_name: 'data.name',
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
            Interactive mapping editor with autocomplete dropdown
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
        <h2>Editable GA4 Mapping</h2>
        <p className="demo-section-description">
          Full GA4 mapping configuration with editor and code toggle. Try
          selecting different rules from the dropdown!
        </p>
        <MappingBox
          mapping={editableMapping}
          onMappingChange={setEditableMapping}
          label="GA4 E-Commerce Mapping"
          initialTab="editor"
        />
      </div>

      <div className="demo-section">
        <h2>Read-Only Simplified Mapping</h2>
        <p className="demo-section-description">
          Simplified mapping configuration in read-only mode
        </p>
        <MappingBox
          mapping={simplifiedMapping}
          label="Basic Mapping (Read-only)"
          initialTab="code"
        />
      </div>

      <div className="demo-section">
        <h2>Features</h2>
        <ul className="demo-feature-list">
          <li>
            <strong>Editor View:</strong> Interactive autocomplete dropdown to
            select mapping rules
          </li>
          <li>
            <strong>Code View:</strong> Full JSON display with syntax
            highlighting
          </li>
          <li>
            <strong>Auto-complete:</strong> Filter rules by typing (e.g., type
            "product" to see all product rules)
          </li>
          <li>
            <strong>Keyboard Navigation:</strong> Use arrow keys, Enter to
            select, Escape to close
          </li>
          <li>
            <strong>Theme Support:</strong> Automatically adapts to light/dark
            theme
          </li>
          <li>
            <strong>Rule Display:</strong> View complete JSON configuration for
            selected rule
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
