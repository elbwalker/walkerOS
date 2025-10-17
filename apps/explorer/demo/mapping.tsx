import React from 'react';
import { createRoot } from 'react-dom/client';
import { MappingCode } from '../src/components/demos/MappingCode';
import { MappingDemo } from '../src/components/demos/MappingDemo';
import { getMappingEvent, getMappingValue, createEvent } from '@walkeros/core';
import '../src/styles/index.css';
import './demo.css';

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
        collector: { id: 'demo' } as unknown as Collector.Instance,
      },
    );
    return JSON.stringify(result, null, 2);
  } catch (error) {
    throw error;
  }
}

const App = () => {
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
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="demo-container">
      <div className="demo-header">
        <h1 className="demo-title">walkerOS Explorer - Mapping Demos</h1>
        <button
          onClick={toggleTheme}
          className="demo-theme-toggle"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>

      <section className="demo-section">
        <h2>MappingCode - Built-in walkerOS Mapping Logic</h2>
        <p className="demo-section-description">
          Execute code with getMappingEvent, getMappingValue, and createEvent
          available
        </p>
        <MappingCode
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

      <section className="demo-section">
        <h2>MappingDemo - Custom Transformation Function</h2>
        <p className="demo-section-description">
          Generic dual-editor component with custom transformation logic
        </p>
        <MappingDemo
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
