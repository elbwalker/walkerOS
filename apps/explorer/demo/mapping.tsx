import React from 'react';
import { createRoot } from 'react-dom/client';
import { MappingCode } from '../src/components/demos/MappingCode';
import { MappingDemo } from '../src/components/demos/MappingDemo';
import { getMappingEvent, getMappingValue, createEvent } from '@walkeros/core';

// Monaco Editor loads from CDN by default - no configuration needed
// This works consistently across all environments (Vite, Webpack, etc.)

// Transformation function for MappingDemo
async function transformMapping(
  input: string,
  config: string,
): Promise<string> {
  try {
    const data = JSON.parse(input);
    const mapping = JSON.parse(config);
    const event = createEvent({ name: 'product view', data });
    const mappingResult = await getMappingEvent(event, mapping);
    const result = await getMappingValue(
      event,
      mappingResult.eventMapping?.data,
      {
        collector: { id: 'demo' } as any,
      },
    );
    return JSON.stringify(result, null, 2);
  } catch (error) {
    throw error;
  }
}

const App = () => {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    // Check system preference
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
    return 'light';
  });

  React.useEffect(() => {
    // Apply theme to html element
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
        <h1 style={{ margin: 0 }}>walkerOS Explorer - Mapping Demos</h1>
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

      <section style={{ marginBottom: '3rem' }}>
        <h2>MappingCode - Built-in walkerOS Mapping Logic</h2>
        <p style={{ marginBottom: '1rem', color: '#666' }}>
          Execute code with getMappingEvent, getMappingValue, and createEvent
          available
        </p>
        <MappingCode
          theme={theme}
          input={`await getMappingEvent(
  { name: 'product view' },
  {
    product: {
      view: {
        name: 'view_item',
        data: {
          map: {
            item_id: 'data.id',
            item_name: 'data.name'
          }
        }
      }
    }
  }
);`}
        />
      </section>

      <section>
        <h2>MappingDemo - Custom Transformation Function</h2>
        <p style={{ marginBottom: '1rem', color: '#666' }}>
          Generic dual-editor component with custom transformation logic
        </p>
        <MappingDemo
          theme={theme}
          input={`{
  "id": "P123",
  "productName": "Laptop",
  "price": 999
}`}
          config={`{
  "product": {
    "view": {
      "name": "view_item",
      "data": {
        "map": {
          "item_id": "data.id",
          "item_name": "data.productName",
          "price": "data.price",
          "currency": { "value": "USD" }
        }
      }
    }
  }
}`}
          labelInput="Event Data"
          labelConfig="Mapping Config"
          labelOutput="Transformed Result"
          fn={transformMapping}
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
