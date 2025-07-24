import React from 'react';
import {
  LiveCode,
  DestinationContextProvider,
  DestinationInit,
  DestinationPush,
  Tagging,
} from '../index';
import { createTagger } from '@walkerOS/core';

// Example 1: Basic LiveCode for utility functions
export const TaggerExample: React.FC = () => {
  const runTagger = async (
    input: unknown,
    _config: unknown,
    log: (...args: unknown[]) => void,
  ) => {
    try {
      const tagger = createTagger();
      // Parse input as a tagger chain
      const result = await new Function(
        'createTagger',
        `return ${String(input)}`,
      )(createTagger);
      log(result);
    } catch (error) {
      log(`Error: ${error}`);
    }
  };

  return (
    <LiveCode
      input="createTagger().entity('product').action('view').property('id', '12345')"
      fn={runTagger}
      labelInput="Tagger Code"
      labelOutput="Generated Attribute"
      fnName="tagger"
    />
  );
};

// Example 2: LiveDestination for destination testing
export const DestinationExample: React.FC = () => {
  // Mock destination function
  const mockDestination = {
    init: async (config: unknown) => {
      // eslint-disable-next-line no-console
      console.log('Destination initialized with config:', config);
    },
    push: async (event: unknown, config: unknown) => {
      // eslint-disable-next-line no-console
      console.log('Event pushed:', event, 'with config:', config);
    },
  };

  return (
    <DestinationContextProvider
      destination={mockDestination}
      fnName="gtag"
      initialConfig={{ measurementId: 'G-XXXXXXXXXX' }}
    >
      <div style={{ marginBottom: '20px' }}>
        <h3>Destination Initialization</h3>
        <DestinationInit custom={{ measurementId: 'G-XXXXXXXXXX' }} />
      </div>

      <div>
        <h3>Event Push Testing</h3>
        <DestinationPush
          event={{
            event: 'product view',
            data: {
              id: '12345',
              name: 'Example Product',
              category: 'Electronics',
            },
          }}
          mapping={{
            id: 'item_id',
            name: 'item_name',
            category: 'item_category',
          }}
        />
      </div>
    </DestinationContextProvider>
  );
};

// Example 3: Tagging component for HTML preview
export const TaggingExample: React.FC = () => {
  const htmlCode = `<div data-elb="product" data-elb-product="id:12345;name:Example Product;category:Electronics">
  <h2>Example Product</h2>
  <p>Category: Electronics</p>
  <button data-elb-product="trigger">Add to Cart</button>
</div>`;

  return (
    <Tagging
      code={htmlCode}
      height="500px"
      previewId="example-preview"
      fn={(event) => {
        // Custom event processing
        return {
          ...event,
          processed: true,
          timestamp: new Date().toISOString(),
        };
      }}
    />
  );
};

// Example 4: Complete integration example
export const CompleteExample: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>walkerOS Explorer Components Examples</h1>

      <section style={{ marginBottom: '40px' }}>
        <h2>1. Tagger Utility</h2>
        <TaggerExample />
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>2. Destination Testing</h2>
        <DestinationExample />
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>3. HTML Tagging Preview</h2>
        <TaggingExample />
      </section>
    </div>
  );
};

export default CompleteExample;
