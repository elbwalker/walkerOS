import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigEditor } from '../src/components/organisms/config-editor';
import type { DestinationConfig } from '../src/components/organisms/destination-box';
import { DemoTemplate } from './shared/DemoTemplate';
import {
  schema as metaSchema,
  DestinationMeta,
} from '@walkeros/web-destination-meta';
import {
  DESTINATION_CONFIG_STRUCTURE,
  MAPPING_RULE_STRUCTURE,
} from '../src/schemas/config-structures';

const initialFullConfig: DestinationConfig<DestinationMeta.Types> = {
  settings: {
    pixelId: '1234567890123456',
  },
  mapping: {
    page: {
      view: {
        name: 'PageView',
        batch: 1000,
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
      },
    },
  },
  data: {
    map: {
      user_id: 'user.id',
      session_id: 'user.session',
    },
  },
  policy: {
    'consent.marketing': true,
  },
  consent: {
    functional: true,
    marketing: false,
  },
  id: 'meta-pixel',
  loadScript: true,
  queue: true,
  verbose: false,
};

const initialRuleConfig = {
  name: 'PageView',
  batch: 1000,
  settings: {
    track: 'PageView',
  },
};

const genericSchemas = {
  settings: metaSchema.settingsSchema,
  settingsUi: metaSchema.settingsUiSchema,
  mapping: metaSchema.mappingSchema,
  mappingUi: metaSchema.mappingUiSchema,
  data: metaSchema.dataSchema,
  dataUi: metaSchema.dataUiSchema,
};

function App() {
  const [fullConfig, setFullConfig] =
    React.useState<DestinationConfig<DestinationMeta.Types>>(initialFullConfig);
  const [ruleConfig, setRuleConfig] = React.useState(initialRuleConfig);

  return (
    <DemoTemplate
      title="ConfigEditor Demo"
      componentName="ConfigEditor"
      description="Generic visual editor component"
    >
      <div style={{ padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>
            Full DestinationConfig
          </h2>
          <ConfigEditor
            config={fullConfig}
            onChange={setFullConfig}
            structure={DESTINATION_CONFIG_STRUCTURE}
            schemas={genericSchemas}
            label="Meta Pixel Configuration"
            initialTab="visual"
            resizable
          />
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>
            Single Mapping Rule
          </h2>
          <ConfigEditor
            config={ruleConfig}
            onChange={setRuleConfig}
            structure={MAPPING_RULE_STRUCTURE}
            schemas={{
              mapping: metaSchema.mappingSchema,
            }}
            label="Page View Rule"
            initialTab="visual"
            resizable
          />
        </section>
      </div>
    </DemoTemplate>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
