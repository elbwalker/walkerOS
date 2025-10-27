import React from 'react';
import { createRoot } from 'react-dom/client';
import { MappingBox } from '../src/components/organisms/mapping-box';
import { DemoTemplate } from './shared/DemoTemplate';
import { schema as metaSchema } from '@walkeros/web-destination-meta';

// Extended Meta Pixel schema for widget showcase demo
// Uses real schemas from @walkeros/web-destination-meta plus additional examples
const metaPixelMockSchema = {
  mappingSchema: {
    type: 'object',
    title: 'Meta Pixel Mapping - Widget Showcase',
    properties: {
      // Standard select widget (enum)
      track: {
        type: 'string',
        title: 'Standard Event',
        description: 'Meta Pixel standard event name',
        enum: [
          'PageView',
          'AddPaymentInfo',
          'AddToCart',
          'AddToWishlist',
          'CompleteRegistration',
          'Contact',
          'CustomizeProduct',
          'Donate',
          'FindLocation',
          'InitiateCheckout',
          'Lead',
          'Purchase',
          'Schedule',
          'Search',
          'StartTrial',
          'SubmitApplication',
          'Subscribe',
          'ViewContent',
        ],
      },

      // Text input widget
      trackCustom: {
        type: 'string',
        title: 'Custom Event',
        description: 'Custom event name for trackCustom',
      },

      // TagInput widget - string array
      categories: {
        type: 'array',
        title: 'Categories',
        description: 'Event categories for filtering and organization',
        items: {
          type: 'string',
          enum: [
            'electronics',
            'clothing',
            'food',
            'toys',
            'books',
            'sports',
            'home',
            'automotive',
          ],
        },
      },

      // MultiInput widget - string OR string[]
      emails: {
        title: 'Email(s)',
        description: 'Email address or list of email addresses',
        oneOf: [
          {
            type: 'string',
            title: 'Single Email',
          },
          {
            type: 'array',
            title: 'Multiple Emails',
            items: { type: 'string' },
          },
        ],
      },

      // UnionTypeSwitcher widget - boolean OR object
      advancedTracking: {
        title: 'Advanced Tracking',
        description: 'Enable advanced tracking or configure tracking settings',
        oneOf: [
          {
            type: 'boolean',
            title: 'Simple Toggle',
          },
          {
            type: 'object',
            title: 'Advanced Config',
            properties: {
              pixelId: {
                type: 'string',
                title: 'Pixel ID',
              },
              testMode: {
                type: 'boolean',
                title: 'Test Mode',
              },
            },
          },
        ],
      },

      // CodeEditor widget - function string
      dataTransform: {
        type: 'string',
        title: 'Data Transform',
        description: 'Function to transform event data before sending',
      },

      // Number widget
      priority: {
        type: 'number',
        title: 'Priority',
        description: 'Event priority level (1-10)',
        minimum: 1,
        maximum: 10,
      },

      // Boolean widget
      enabled: {
        type: 'boolean',
        title: 'Enabled',
        description: 'Enable or disable this tracking rule',
      },
    },
  },
  mappingUiSchema: {
    track: {
      'ui:placeholder': 'Select standard event',
      'ui:help': 'Example: ViewContent, AddToCart, Purchase',
    },
    trackCustom: {
      'ui:placeholder': 'e.g., CustomCheckout',
      'ui:help': 'Example: CustomCheckout, VideoPlayed, NewsletterSignup',
    },
    categories: {
      'ui:placeholder': 'Add category...',
      'ui:help': 'Array of strings - edit via set pane',
    },
    emails: {
      'ui:placeholder': 'Enter email(s)',
      'ui:help': 'String or array - edit via value pane',
    },
    advancedTracking: {
      'ui:help': 'Boolean or object - edit via value/map pane',
    },
    dataTransform: {
      'ui:placeholder': '// Enter transformation function',
      'ui:help': 'Function string - edit via fn pane',
    },
    priority: {
      'ui:placeholder': '5',
      'ui:help': 'Example: 1 (lowest) to 10 (highest)',
    },
    enabled: {
      'ui:help': 'Example: true (enabled) or false (disabled)',
    },
    'ui:order': [
      'track',
      'trackCustom',
      'categories',
      'emails',
      'advancedTracking',
      'dataTransform',
      'priority',
      'enabled',
    ],
  },
};

// Meta Pixel mapping example with settings (Phase 1 Demo)
// Meta Pixel mapping - COMPREHENSIVE WIDGET SHOWCASE
// Each rule demonstrates different widget combinations
const metaMapping = {
  page: {
    view: {
      name: 'page_view',
      // Example 1: Code editor with multi-line function
      settings: {
        track: 'PageView',
        trackCustom: '',
        categories: ['home', 'public'],
        dataTransform:
          '(data, config) => {\n  // Add page metadata\n  return {\n    ...data,\n    page_title: document.title,\n    page_url: window.location.href,\n    timestamp: Date.now()\n  };\n}',
        priority: 1,
        enabled: true,
      },
    },
  },
  product: {
    view: {
      name: 'product_view',
      // Example 2: Tag input + single email + boolean tracking
      settings: {
        track: 'ViewContent',
        trackCustom: 'ProductViewed',
        categories: ['electronics', 'featured'],
        emails: 'admin@example.com',
        advancedTracking: true,
        dataTransform: '(data) => ({ ...data, currency: "USD" })',
        priority: 7,
        enabled: true,
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
      // Example 3: Multiple emails + object tracking config
      settings: {
        track: 'AddToCart',
        trackCustom: 'CartUpdate',
        categories: ['clothing', 'sports', 'toys'],
        emails: ['user@example.com', 'admin@example.com'],
        advancedTracking: {
          pixelId: '1234567890',
          testMode: false,
        },
        dataTransform:
          '(data) => {\n  if (!data.price) return null;\n  return { ...data, discounted: data.price < 50 };\n}',
        priority: 5,
        enabled: true,
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
      // Example 4: Minimal settings (only required fields)
      settings: {
        track: 'Purchase',
        categories: ['checkout', 'conversion'],
        priority: 10,
        enabled: true,
      },
      data: {
        map: {
          content_ids: { loop: ['nested', { map: { id: 'data.id' } }] },
          content_type: { value: 'product' },
          value: 'data.total',
          currency: { value: 'USD', key: 'data.currency' },
        },
      },
    },
  },
};

function App() {
  const [mappingValue, setMappingValue] =
    React.useState<Record<string, Record<string, unknown>>>(metaMapping);

  return (
    <DemoTemplate
      title="Meta Pixel Mapping - Widget Showcase"
      componentName="MappingBox"
      description="Schema-aware configuration with comprehensive widget demonstrations"
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <MappingBox
          mapping={mappingValue}
          onMappingChange={setMappingValue}
          label="Meta Pixel Mapping"
          initialTab="visual"
          resizable
          schemas={{
            mapping: metaPixelMockSchema.mappingSchema,
            mappingUi: metaPixelMockSchema.mappingUiSchema,
            data: metaSchema.dataSchema,
            dataUi: metaSchema.dataUiSchema,
          }}
        />
      </div>
    </DemoTemplate>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
