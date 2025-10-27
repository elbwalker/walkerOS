import React from 'react';
import { createRoot } from 'react-dom/client';
import { MappingCode } from '../src/components/demos/MappingCode';
import { MappingDemo } from '../src/components/demos/MappingDemo';
import { getMappingEvent, getMappingValue, createEvent } from '@walkeros/core';
import { DemoTemplate } from './shared/DemoTemplate';

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
  return (
    <DemoTemplate
      title="Mapping Transformation"
      componentName="MappingCode + MappingDemo"
      description="Live mapping examples with transformation functions"
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <section style={{ marginBottom: '3rem' }}>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
            }}
          >
            Built-in walkerOS Mapping
          </h2>
          <p
            style={{
              color: '#666',
              marginBottom: '1rem',
              fontSize: '0.875rem',
            }}
          >
            Execute code with getMappingEvent, getMappingValue, and createEvent
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

        <section>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
            }}
          >
            Custom Transformation
          </h2>
          <p
            style={{
              color: '#666',
              marginBottom: '1rem',
              fontSize: '0.875rem',
            }}
          >
            Generic dual-editor with custom transformation logic
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
    </DemoTemplate>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
