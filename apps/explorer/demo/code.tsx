import React from 'react';
import { createRoot } from 'react-dom/client';
import { CodeBox } from '../src/components/organisms/code-box';
import '../src/styles/layout.css';

const typescriptExample = `// Event Naming - Entity Action Format
const event = {
  name: 'product view',  // ✅ Correct: space-separated
  data: {
    id: 'P123',
    name: 'Laptop',
    price: 999
  },
  context: {
    stage: ['shopping', 1]
  },
  globals: {
    language: 'en',
    currency: 'USD'
  }
};`;

const mappingExample = `const mapping = {
  // Exact entity-action match
  product: {
    view: { name: 'view_item' },
    add: { name: 'add_to_cart' },
  },

  // Wildcard patterns
  product: {
    '*': { name: 'product_interaction' }
  },

  // Conditional mappings
  order: {
    complete: [
      {
        condition: (event) => event.data?.value > 100,
        name: 'high_value_purchase',
      },
      { name: 'purchase' }
    ],
  },
};`;

const jsonExample = `{
  "destinations": {
    "gtag": {
      "config": {
        "settings": {
          "ga4": {
            "measurementId": "G-XXXXXXXXXX"
          }
        },
        "mapping": {
          "product": {
            "view": {
              "name": "view_item",
              "data": {
                "map": {
                  "currency": { "value": "USD" },
                  "value": "data.price"
                }
              }
            }
          }
        }
      }
    }
  }
}`;

const collectorExample = `import { startFlow } from '@walkeros/collector';

export async function setupCollector() {
  const { collector, elb } = await startFlow({
    destinations: {
      console: {
        type: 'console',
        push: async (event) => {
          console.log('Event:', event);
        },
        config: {
          mapping: {
            page: {
              view: { name: 'pageview' }
            }
          }
        }
      }
    }
  });

  return { collector, elb };
}`;

const valueMappingExample = `// Transform values using mapping strategies
await getMappingValue(
  {
    product: { id: 'P123', name: 'Laptop', price: 999 },
    user: { id: 'U456' }
  },
  {
    map: {
      item_id: 'product.id',
      item_name: 'product.name',
      value: 'product.price',
      user_id: 'user.id',
      currency: { value: 'USD' },
    }
  }
);`;

const shortExample = `const x = 1;
const y = 2;
return x + y;`;

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

  const [editableCode, setEditableCode] = React.useState(shortExample);

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
          <h1 style={{ margin: 0, marginBottom: '0.5rem' }}>
            Code Display Component
          </h1>
          <p style={{ margin: 0, color: theme === 'dark' ? '#ccc' : '#666' }}>
            Static code examples with syntax highlighting and copy functionality
          </p>
          <div style={{ marginTop: '1rem' }}>
            <a
              href="/"
              style={{
                color: theme === 'dark' ? '#58a6ff' : '#0969da',
                textDecoration: 'none',
              }}
            >
              ← Back to demos
            </a>
          </div>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <section>
          <h2>TypeScript Event Example (with autoHeight)</h2>
          <CodeBox
            code={typescriptExample}
            language="typescript"
            label="Event Structure"
            showCopy={true}
            autoHeight={true}
          />
        </section>

        <section>
          <h2>Mapping Configuration</h2>
          <CodeBox
            code={mappingExample}
            language="javascript"
            label="Mapping Rules"
            showCopy={true}
          />
        </section>

        <section>
          <h2>JSON Configuration</h2>
          <CodeBox
            code={jsonExample}
            language="json"
            label="Destination Config"
            showCopy={true}
          />
        </section>

        <section>
          <h2>Collector Setup</h2>
          <CodeBox
            code={collectorExample}
            language="typescript"
            label="Setup Function"
            showCopy={true}
          />
        </section>

        <section>
          <h2>Value Mapping Example</h2>
          <CodeBox
            code={valueMappingExample}
            language="javascript"
            label="getMappingValue Usage"
            showCopy={true}
          />
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h2>Auto-Height Feature</h2>
          <p
            style={{
              color: theme === 'dark' ? '#b3b3b3' : '#666',
              marginBottom: '1rem',
            }}
          >
            Use <code>autoHeight</code> prop to dynamically size boxes based on
            content. Try editing the code below - it will automatically adjust
            height as you type! Combine with <code>maxHeight</code> to limit
            maximum size (this one has max 300px).
          </p>
          <CodeBox
            code={editableCode}
            language="javascript"
            label="Editable (autoHeight, max 300px)"
            autoHeight={true}
            maxHeight={300}
            onChange={setEditableCode}
            showCopy={true}
          />
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h2>Component Features</h2>
          <ul style={{ color: theme === 'dark' ? '#b3b3b3' : '#666' }}>
            <li>Read-only code display with syntax highlighting</li>
            <li>Multiple language support (TypeScript, JavaScript, JSON)</li>
            <li>Optional copy-to-clipboard functionality</li>
            <li>Automatic theme detection (light/dark)</li>
            <li>
              <strong>Auto-height mode</strong> - dynamically adjusts to content
              size
            </li>
            <li>Perfect for documentation and static examples</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
