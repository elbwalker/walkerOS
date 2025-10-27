import React from 'react';
import { createRoot } from 'react-dom/client';
import { MappingBox } from '../src/components/organisms/mapping-box';
import '../src/styles/index.scss';
import './demo.css';
import {
  gtagMappingSchema,
  gtagMappingUiSchema,
  gtagMappingExample,
} from './gtag-schema';
import {
  mappingSchemaGenerated,
  mappingUiSchemaGenerated,
} from '@walkeros/web-destination-meta';

// Mock Meta Pixel schema for settings demo (Phase 1 + Widget Showcase)
// Based on @walkeros/web-destination-meta/src/schema.ts with extensions
const metaPixelMockSchema = {
  mappingSchema: {
    type: 'object',
    title: 'Meta Pixel Mapping - Widget Showcase',
    properties: {
      // Standard select widget (enum)
      track: {
        type: 'string',
        title: '1. Standard Event (Dropdown)',
        description: 'Built-in RJSF SelectWidget for string enums',
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
        title: '2. Custom Event (Text Input)',
        description: 'MappingStringWidget for simple text',
      },

      // TagInput widget - string array
      categories: {
        type: 'array',
        title: '3. Categories (Tag Input)',
        description: 'TagInputWidget for managing string arrays with chips',
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
        title: '4. Email(s) (Multi Input)',
        description: 'MultiInputWidget for string | string[] union type',
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
        title: '5. Advanced Tracking (Union Type)',
        description: 'UnionTypeSwitcherWidget for boolean | object union',
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
        title: '6. Data Transform (Code Editor)',
        description: 'CodeEditorWidget for editing function code',
      },

      // Number widget
      priority: {
        type: 'number',
        title: '7. Priority (Number Input)',
        description: 'MappingNumberWidget for numeric values',
        minimum: 1,
        maximum: 10,
      },

      // Boolean widget
      enabled: {
        type: 'boolean',
        title: '8. Enabled (Checkbox)',
        description: 'MappingBooleanWidget for toggles',
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
  const [editableMetaMapping, setEditableMetaMapping] =
    React.useState(metaMapping);
  const [editableGtagMapping, setEditableGtagMapping] =
    React.useState(gtagMappingExample);

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
            New editor with settings (Phase 1), tree navigation, and comparison
            to original
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
        <h2>Gtag Mapping - Nested Settings Demo (Phase 2C)</h2>
        <p className="demo-section-description">
          Demonstrates nested settings navigation for destinations with multiple
          sub-configurations (GA4, Google Ads, GTM). Navigate to any rule's
          settings to see navigable list of ga4/ads/gtm options.
        </p>
        <MappingBox
          mapping={editableGtagMapping}
          onMappingChange={setEditableGtagMapping}
          label="Gtag Mapping (Nested Settings Navigation)"
          initialTab="editor"
          resizable
          useNewEditor
          schemas={{
            mapping: gtagMappingSchema,
            mappingUi: gtagMappingUiSchema,
          }}
        />
        <div
          className="demo-phase-info"
          style={{
            marginTop: '16px',
            padding: '16px',
            background: 'var(--bg-header)',
            borderRadius: '4px',
            border: '1px solid var(--border-box)',
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: '16px' }}>Phase 2C Features:</h3>
          <ul className="demo-feature-list" style={{ marginBottom: 0 }}>
            <li>
              <strong>Nested Settings Navigation:</strong> Navigate to any rule
              (e.g., "product → view") and click "Settings"
            </li>
            <li>
              <strong>Object Explorer:</strong> Settings shows navigable list:
              ga4, ads, gtm
            </li>
            <li>
              <strong>Deep Navigation:</strong> Click "ga4" to open GA4-specific
              form (include, measurementId, etc.)
            </li>
            <li>
              <strong>Breadcrumb Navigation:</strong> Use breadcrumb or back
              button to return to settings list
            </li>
            <li>
              <strong>Schema Extraction:</strong> Each nested object extracts
              its own schema from parent
            </li>
            <li>
              <strong>Multiple Configs:</strong> Test ads and gtm settings on
              different rules
            </li>
          </ul>
        </div>
      </div>

      <div className="demo-section">
        <h2>Meta Pixel Mapping - Flat Settings Demo (Phase 1)</h2>
        <p className="demo-section-description">
          Demonstrates flat settings (single form) for destinations without
          nested structure. Navigate to any rule's settings to see inline form.
        </p>
        <MappingBox
          mapping={editableMetaMapping}
          onMappingChange={setEditableMetaMapping}
          label="Meta Pixel Mapping (Flat Settings)"
          initialTab="editor"
          resizable
          useNewEditor
          schemas={{
            mapping: mappingSchemaGenerated,
            mappingUi: mappingUiSchemaGenerated,
          }}
        />
        <div
          className="demo-phase-info"
          style={{
            marginTop: '16px',
            padding: '16px',
            background: 'var(--bg-header)',
            borderRadius: '4px',
            border: '1px solid var(--border-box)',
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: '16px' }}>Phase 1 Features:</h3>
          <ul className="demo-feature-list" style={{ marginBottom: 0 }}>
            <li>
              <strong>Schema-Aware Settings:</strong> Navigate to any rule
              (e.g., "product → view") and expand "Settings"
            </li>
            <li>
              <strong>Inline Form:</strong> All settings render as single form
              (no nesting)
            </li>
            <li>
              <strong>Widget Showcase:</strong> Demonstrates 8 different widget
              types in one schema
            </li>
            <li>
              <strong>Live Updates:</strong> Switch to "Code" view to see JSON
              update in real-time
            </li>
            <li>
              <strong>Clear Settings:</strong> Button to remove all
              configuration
            </li>
          </ul>
        </div>
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
            <strong>Settings Field (Phase 1):</strong> Destination-specific
            configuration with schema-aware dropdowns (see Meta Pixel demo)
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
