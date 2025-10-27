import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  DestinationBox,
  type DestinationConfig,
} from '../src/components/organisms/destination-box';
import { DemoTemplate } from './shared/DemoTemplate';
import {
  schema as metaSchema,
  DestinationMeta,
} from '@walkeros/web-destination-meta';

// Typed destination configuration using Meta Pixel types
// This provides full TypeScript support for settings and mapping
const initialConfig: DestinationConfig<DestinationMeta.Types> = {
  // Config-level settings
  settings: {
    pixelId: '1234567890123456',
  },

  // Event mapping rules
  mapping: {
    page: {
      view: {
        name: 'PageView',
        settings: {
          track: 'PageView',
        },
      },
    },
    product: {
      view: {
        name: 'view_content',
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
            content_ids: { loop: ['nested', { map: { id: 'data.id' } }] },
            content_type: { value: 'product' },
            value: 'data.total',
            currency: { value: 'USD', key: 'data.currency' },
          },
        },
      },
    },
  },

  // Global data transformations
  data: {
    map: {
      user_id: 'user.id',
      session_id: 'user.session',
    },
  },

  // Processing policy
  policy: {
    'consent.marketing': true,
  },

  // Consent requirements
  consent: {
    functional: true,
    marketing: false,
  },

  // Options
  id: 'meta-pixel',
  loadScript: true,
  queue: true,
  verbose: false,
};

function App() {
  const [config, setConfig] =
    React.useState<DestinationConfig<DestinationMeta.Types>>(initialConfig);

  return (
    <DemoTemplate
      title="Destination Configuration Editor"
      componentName="DestinationBox"
      description="Complete destination config editor with settings, mapping, data, policy, consent, and options"
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <DestinationBox<DestinationMeta.Types>
          config={config}
          onConfigChange={setConfig}
          label="Meta Pixel Configuration"
          initialTab="visual"
          resizable
          schemas={{
            settings: metaSchema.settingsSchema,
            settingsUi: metaSchema.settingsUiSchema,
            mapping: metaSchema.mappingSchema,
            mappingUi: metaSchema.mappingUiSchema,
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
