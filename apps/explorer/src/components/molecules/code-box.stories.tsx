import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { schemas } from '@walkeros/core/dev';
import { CodeBox } from './code-box';
import { enrichFlowConfigSchema } from '../../utils/monaco-schema-flow-config';
import { getEnrichedContractSchema } from '../../utils/monaco-schema-contract';
import { getVariablesSchema } from '../../utils/monaco-schema-variables';

/**
 * CodeBox - Monaco Editor wrapped in a Box component
 *
 * Combines the Code atom with Box container, providing header and toolbar actions.
 * Supports copy to clipboard, JSON formatting, and flexible height modes.
 */
const meta: Meta<typeof CodeBox> = {
  component: CodeBox,
  title: 'Molecules/CodeBox',
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CodeBox>;

/**
 * Read-only JSON output, the most common form in the app: `disabled` with an
 * `autoHeight` range so the box sizes to its content.
 */
export const Default: Story = {
  args: {
    code: `{
  "name": "product view",
  "data": { "id": "ers", "name": "Everyday Ruck Snack", "price": 420 }
}`,
    language: 'json',
    label: 'Output',
    disabled: true,
    autoHeight: { min: 160, max: 600 },
  },
};

const flowJsonCode = `{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "web" },
      "sources": {
        "browser": { "package": "@walkeros/web-source-browser" }
      },
      "destinations": {
        "ga4": { "package": "@walkeros/web-destination-gtag" }
      }
    }
  }
}`;

/**
 * Mac-style code window with traffic lights and a filename tab, read-only and
 * sized to its content. The website getting-started section uses this form.
 */
export const WithTrafficLights: Story = {
  args: {
    showTrafficLights: true,
    tabs: [
      { id: 'file', label: 'flow.json', code: flowJsonCode, language: 'json' },
    ],
    disabled: true,
    autoHeight: true,
    style: { maxWidth: '800px' },
  },
};

/**
 * Read-only file tabs: clicking a tab switches the code content.
 */
export const WithTabs: Story = {
  args: {
    tabs: [
      {
        id: 'html',
        label: 'product.html',
        code: `<div data-elb="product" data-elbaction="load:view">
  <h1 data-elb-product="name">Sneakers</h1>
  <button data-elbaction="click:add">Add to Cart</button>
</div>`,
        language: 'html',
      },
      {
        id: 'product',
        label: 'ProductDetail.tsx',
        code: `import { createTagger } from '@walkeros/web-source-browser';

const tagger = createTagger();

export function ProductDetail() {
  return <div {...tagger().entity('product').action('load', 'view').get()} />;
}`,
        language: 'typescript',
      },
    ],
    packages: ['@walkeros/core'],
    disabled: true,
  },
};

/**
 * Cursor-preservation repro (used by the dev-only Playwright check).
 *
 * A controlled parent whose value is replaced externally (the "apply external"
 * button changes only line 3). With the fix, the caret keeps its line/column;
 * without it the full-range replace shoves the caret to the document end.
 */
export const ExternalValueChange: Story = {
  render: () => {
    const [code, setCode] = useState('{\n  "version": 4,\n  "flows": {}\n}');
    return (
      <div>
        <button
          type="button"
          data-testid="apply-external"
          onClick={() =>
            setCode('{\n  "version": 4,\n  "flows": { "a": {} }\n}')
          }
        >
          apply external
        </button>
        <CodeBox
          code={code}
          onChange={setCode}
          language="json"
          label="External value change"
          jsonSchema={{ type: 'object' }}
        />
      </div>
    );
  },
};

/**
 * Contract editor: the enriched contract schema with entity and action
 * snippets, as the app's contract JSON mode renders it.
 *
 * **How to verify:** Autocomplete inside entities shows entity snippet;
 * hover on properties shows markdown descriptions.
 */
export const EnrichedContract: Story = {
  render: () => {
    const [code, setCode] = useState(JSON.stringify({ $tagging: 1 }, null, 2));
    return (
      <CodeBox
        code={code}
        onChange={setCode}
        language="json"
        height={400}
        showFormat
        jsonSchema={getEnrichedContractSchema()}
      />
    );
  },
};

/**
 * Variables editor: the variables schema with `$var.` interpolation docs, as
 * the app's variables code view renders it.
 *
 * **How to verify:** Autocomplete shows "Add string variable",
 * "Add boolean variable", "Add number variable" snippets.
 */
export const VariablesEditor: Story = {
  render: () => {
    const [code, setCode] = useState(
      JSON.stringify({ measurementId: 'G-XXXXXXXXXX', debug: false }, null, 2),
    );
    return (
      <CodeBox
        code={code}
        onChange={setCode}
        language="json"
        autoHeight={{ min: 250, max: 400 }}
        showFormat
        jsonSchema={getVariablesSchema()}
      />
    );
  },
};

/**
 * Flow editor: the enriched Flow.Json schema plus an IntelliSense context
 * derived from the flow itself, as the app's flow code view renders it.
 *
 * Variables defined in the flow become `$var.` completions in the same
 * editor. `$var.`, `$secret.`, `$env.` and `$code:` references are colored
 * by type.
 *
 * **How to verify:**
 * - Add a variable in the `"variables"` section (e.g., `"myVar": "hello"`)
 * - In a destination config, type `$var.` and the new variable appears
 * - Rename or delete the variable and the completions update
 * - `$var.nonExistent` gets a warning marker
 * - Each reference type is colored differently
 */
export const DynamicFlowContext: Story = {
  name: 'Dynamic Flow Context',
  render: () => {
    const [code, setCode] = useState(
      JSON.stringify(
        {
          version: 4,
          variables: {
            pixelId: '1234567890',
            debug: false,
            cleanEvent: { filter: true },
          },
          flows: {
            default: {
              config: { platform: 'server' },
              sources: {
                express: { package: '@walkeros/server-source-express' },
              },
              destinations: {
                meta: {
                  package: '@walkeros/server-destination-meta',
                  config: {
                    settings: {
                      accessToken: '$secret.META_ACCESS_TOKEN',
                      pixelId: '$var.pixelId',
                    },
                    mapping: {
                      order: {
                        complete: {
                          name: 'Purchase',
                          data: {
                            map: {
                              value: {
                                key: 'data.total',
                                fn: '$code:(value) => Number(value)',
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                api: {
                  package: '@walkeros/server-destination-api',
                  config: {
                    settings: {
                      url: '$env.COLLECT_URL',
                      missing: '$var.nonExistent',
                    },
                  },
                },
              },
            },
          },
        },
        null,
        2,
      ),
    );

    const { context } = schemas.validateFlowConfig(code);

    return (
      <CodeBox
        code={code}
        onChange={setCode}
        language="json"
        height={500}
        showFormat
        folding
        sticky
        jsonSchema={enrichFlowConfigSchema(schemas.configJsonSchema)}
        intellisenseContext={context}
      />
    );
  },
};
