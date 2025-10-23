import React from 'react';
import { createRoot } from 'react-dom/client';
import { MappingBox } from '../src/components/organisms/mapping-box';
import { schema as metaSchema } from '@walkeros/web-destination-meta';
import '../src/styles/index.scss';
import './demo.css';

// Meta Pixel mapping example with settings
const metaMapping = {
  page: {
    view: {
      name: 'page_view',
      settings: {
        track: 'PageView',
      },
    },
  },
  product: {
    view: {
      name: 'product_view',
      settings: {
        track: 'ViewContent',
      },
      data: {
        map: {
          content_ids: { loop: ['this', { map: { id: 'data.id' } }] },
          content_type: { value: 'product' },
        },
      },
    },
    add: {
      name: 'add_to_cart',
      settings: {
        track: 'AddToCart',
      },
      data: {
        map: {
          content_ids: { loop: ['this', { map: { id: 'data.id' } }] },
          content_type: { value: 'product' },
          value: 'data.price',
          currency: { value: 'USD', key: 'data.currency' },
        },
      },
    },
  },
  order: {
    complete: {
      name: 'purchase',
      settings: {
        track: 'Purchase',
      },
      data: {
        map: {
          content_ids: {
            loop: [
              'nested',
              {
                map: { id: 'data.id' },
              },
            ],
          },
          content_type: { value: 'product' },
          value: 'data.total',
          currency: { value: 'USD', key: 'data.currency' },
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

  const [editableMapping, setEditableMapping] = React.useState(metaMapping);

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
          <h1 className="demo-title">Settings Implementation Demo - Phase 1</h1>
          <p className="demo-subtitle">
            Meta Pixel destination with type-aware settings editing
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
        <h2>Meta Pixel Mapping - With Schemas (New Editor)</h2>
        <p className="demo-section-description">
          Demonstrates destination-specific settings editing using Meta Pixel's
          schema. The <code>settings.track</code> field shows a dropdown of
          standard event names.
        </p>
        <MappingBox
          mapping={editableMapping}
          onMappingChange={setEditableMapping}
          label="Meta Pixel Mapping (Schema-Aware)"
          initialTab="visual"
          resizable
          useNewEditor
          schemas={{
            mapping: metaSchema.mappingSchema,
            mappingUi: metaSchema.mappingUiSchema,
          }}
        />
      </div>

      <div className="demo-section">
        <h2>Meta Pixel Mapping - Without Schemas (Fallback)</h2>
        <p className="demo-section-description">
          Same mapping without schemas shows JSON editor fallback for settings
          field.
        </p>
        <MappingBox
          mapping={editableMapping}
          onMappingChange={setEditableMapping}
          label="Meta Pixel Mapping (JSON Fallback)"
          initialTab="visual"
          resizable
          useNewEditor={false}
        />
      </div>

      <div className="demo-section">
        <h2>Phase 1 Features</h2>
        <ul className="demo-feature-list">
          <li>
            <strong>Schema Companion Pattern:</strong> Meta destination exports
            RJSF-compatible schemas
          </li>
          <li>
            <strong>Runtime Schema Provision:</strong> Schemas passed via props
            (no tight coupling)
          </li>
          <li>
            <strong>MappingSettingsField:</strong> Custom RJSF field handles
            settings with schema or fallback
          </li>
          <li>
            <strong>Enum Support:</strong> StandardEventNames enum renders as
            dropdown
          </li>
          <li>
            <strong>Progressive Enhancement:</strong> Works without schemas
            (generic JSON editor)
          </li>
          <li>
            <strong>Zero Breaking Changes:</strong> Existing code continues to
            work
          </li>
        </ul>
      </div>

      <div className="demo-section">
        <h2>Current Mapping (JSON View)</h2>
        <pre className="demo-json">
          {JSON.stringify(editableMapping, null, 2)}
        </pre>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
