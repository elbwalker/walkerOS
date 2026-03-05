import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { schemas } from '@walkeros/core/dev';
import { CodeBox } from './code-box';
import { enrichFlowSetupSchema } from '../../utils/monaco-schema-flow-setup';
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
 * Default CodeBox with JavaScript code
 */
export const Default: Story = {
  args: {
    code: `const event = {
  entity: 'product',
  action: 'view',
  data: {
    id: 'P123',
    name: 'Laptop',
    price: 999
  }
};

console.log('Event:', event);`,
    language: 'javascript',
    label: 'Code Editor',
    showCopy: true,
    showFormat: false,
  },
};

const flowJsonCode = `{
  "flows": {
    "default": {
      "sources": {
        "browser": {
          "package": "@walkeros/web-source-browser",
          "config": { "settings": { "pageview": true } }
        }
      },
      "destinations": {
        "ga4": {
          "package": "@walkeros/web-destination-gtag",
          "config": {
            "settings": { "ga4": { "measurementId": "G-XXX" } }
          }
        }
      }
    }
  }
}`;

/**
 * Mac-style code window with traffic lights and filename tab
 *
 * Use this pattern for landing pages and documentation.
 */
export const WithTrafficLights: Story = {
  args: {
    code: flowJsonCode,
    language: 'json',
    showTrafficLights: true,
    tabs: [{ id: 'file', label: 'flow.json', code: flowJsonCode }],
    showCopy: true,
    height: 400,
  },
};

/**
 * CodeBox with multiple tabs - clicking tabs switches code content
 */
export const WithTabs: Story = {
  args: {
    tabs: [
      {
        id: 'config',
        label: 'config.ts',
        code: `export const config = {
  tracking: true,
  debug: false,
  destinations: ['ga4', 'gtm']
};`,
        language: 'typescript',
      },
      {
        id: 'index',
        label: 'index.ts',
        code: `import { config } from './config';
import { elb } from '@walkeros/core';

elb('walker run', config);`,
        language: 'typescript',
      },
      {
        id: 'types',
        label: 'types.ts',
        code: `export interface TrackingConfig {
  tracking: boolean;
  debug: boolean;
  destinations: string[];
}`,
        language: 'typescript',
      },
    ],
    defaultTab: 'config',
    showCopy: true,
    height: 300,
  },
};

/**
 * CodeBox with JSON Schema IntelliSense
 *
 * Demonstrates JSON validation, autocomplete, and hover docs
 * powered by a JSON Schema passed via the `jsonSchema` prop.
 */
export const WithJsonSchema: Story = {
  render: () => {
    const [code, setCode] = useState(
      JSON.stringify({ version: 1, flows: {} }, null, 2),
    );
    return (
      <CodeBox
        code={code}
        onChange={setCode}
        language="json"
        label="Flow Config (with IntelliSense)"
        showFormat
        jsonSchema={{
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {
            version: {
              type: 'number',
              description: 'Flow configuration version',
              enum: [1, 2],
            },
            flows: {
              type: 'object',
              description: 'Named flow configurations',
              additionalProperties: {
                type: 'object',
                properties: {
                  web: { type: 'object', description: 'Web platform config' },
                  server: {
                    type: 'object',
                    description: 'Server platform config',
                  },
                },
              },
            },
          },
          required: ['version', 'flows'],
        }}
      />
    );
  },
};

/**
 * CodeBox with settings toggle
 *
 * Click the gear icon to toggle line numbers, minimap, and word wrap.
 */
export const WithSettings: Story = {
  render: () => {
    const [code, setCode] = useState(
      JSON.stringify(
        {
          version: 1,
          flows: {
            default: {
              sources: {
                browser: {
                  package: '@walkeros/web-source-browser',
                  config: { settings: { pageview: true } },
                },
              },
              destinations: {
                ga4: {
                  package: '@walkeros/web-destination-gtag',
                  config: {
                    settings: { ga4: { measurementId: 'G-XXX' } },
                    mapping: {
                      'page view': { name: 'page_view' },
                      'product view': {
                        name: 'view_item',
                        data: { map: { id: 'items.0.item_id' } },
                      },
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
    return (
      <CodeBox
        code={code}
        onChange={setCode}
        language="json"
        label="Flow Config"
        showFormat
        showSettings
        height={500}
      />
    );
  },
};

// ============================================================
// IntelliSense Stories
// ============================================================

/**
 * Enriched Flow.Setup schema with defaultSnippets and markdownDescription
 *
 * Uses the real Flow.Setup JSON Schema from @walkeros/core, enriched with
 * Monaco-specific extensions (snippets, markdown hover docs).
 *
 * **How to verify:** Place cursor inside `{}` after `"flows":`, press
 * Ctrl+Space — autocomplete shows property suggestions from the schema.
 */
export const EnrichedFlowSetup: Story = {
  render: () => {
    const [code, setCode] = useState(
      JSON.stringify({ version: 1, flows: {} }, null, 2),
    );
    return (
      <CodeBox
        code={code}
        onChange={setCode}
        language="json"
        label="Flow Setup (Enriched Schema)"
        showFormat
        jsonSchema={enrichFlowSetupSchema(
          schemas.setupJsonSchema as Record<string, unknown>,
        )}
        height={400}
      />
    );
  },
};

/**
 * Contract schema with entity/action snippets
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
        label="Data Contract"
        showFormat
        jsonSchema={getEnrichedContractSchema()}
        height={400}
      />
    );
  },
};

/**
 * Variables schema with `$var.` interpolation docs
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
        label="Variables"
        showFormat
        jsonSchema={getVariablesSchema()}
        height={300}
      />
    );
  },
};

/**
 * Visual coloring of `$var.`, `$def.`, `$secret.`, `$env.`, `$code:` references
 *
 * Decorations are applied automatically for JSON content. Each reference type
 * is colored differently: variables=cyan italic, definitions=green italic,
 * secrets/env=amber italic, code=purple.
 *
 * **How to verify:** Each reference value should be colored differently
 * in the editor.
 */
export const ReferenceDecorations: Story = {
  render: () => {
    const [code, setCode] = useState(
      JSON.stringify(
        {
          measurementId: '$var.gaId',
          apiKey: '$secret.apiKey',
          endpoint: '$env.API_URL',
          transform: '$def.cleanEvent',
          code: '$code:myFunction',
        },
        null,
        2,
      ),
    );
    return (
      <CodeBox
        code={code}
        onChange={setCode}
        language="json"
        label="Reference Decorations"
        showFormat
        height={300}
      />
    );
  },
};

/**
 * Dynamic Flow Context — self-referencing IntelliSense
 *
 * Edit the flow JSON and variables/definitions you define become immediately
 * available as `$var.` and `$def.` completions in the same editor.
 *
 * **How to verify:**
 * - Add a variable in the `"variables"` section (e.g., `"myVar": "hello"`)
 * - Scroll down to a destination config and type `$var.` — your new variable appears
 * - Rename or delete the variable — completions update instantly
 * - `$var.nonExistent` gets a warning marker
 */
export const DynamicFlowContext: Story = {
  name: 'Dynamic Flow Context',
  render: () => {
    const [code, setCode] = useState(
      JSON.stringify(
        {
          version: 1,
          variables: { gaId: 'G-XXXXXXXXXX', debug: false },
          definitions: { cleanEvent: { filter: true } },
          flows: {
            default: {
              web: {},
              sources: {
                browser: { package: '@walkeros/web-source-browser' },
              },
              destinations: {
                ga4: {
                  package: '@walkeros/web-destination-gtag',
                  config: {
                    settings: {
                      ga4: { measurementId: '$var.gaId' },
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

    const validation = schemas.validateFlowSetup(code);

    return (
      <CodeBox
        code={code}
        onChange={setCode}
        language="json"
        label="Flow Config (Dynamic Validation)"
        showFormat
        jsonSchema={enrichFlowSetupSchema(
          schemas.setupJsonSchema as Record<string, unknown>,
        )}
        validate={schemas.validateFlowSetup}
        intellisenseContext={validation.context}
        onValidationIssues={(counts) => console.log('Validation:', counts)}
        height={500}
      />
    );
  },
};
