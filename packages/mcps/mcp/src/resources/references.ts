import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PACKAGE_REGISTRY } from '../registry.js';

const FLOW_SCHEMA_REFERENCE = {
  structure: {
    version: '3 (required, use 3 for new flows)',
    flows: {
      '<flowName>': {
        'web: {} | server: {}':
          'Platform marker (exactly one, use empty object as value)',
        packages:
          'Record<packageName, { version?, path?, imports? }> — all referenced packages. Use version to pin: { "@walkeros/web-destination-meta": { "version": "2.1.0" } }',
        sources:
          'Record<name, { package, config?, env?, next? }> — event capture',
        destinations:
          'Record<name, { package, config?: { settings?, mapping?, consent? }, env?, before? }> — event delivery',
        transformers:
          'Record<name, { package, config?, env?, next? }> — event processing',
        stores: 'Record<name, { package, config?, env? }> — key-value storage',
        collector: '{ consent?, globals? } — collector settings (optional)',
      },
    },
    variables: 'Record<string, string> — shared variables (optional)',
    definitions: 'Record<string, object> — reusable definitions (optional)',
    contract: 'Event contract for validation (optional)',
  },
  connectionRules: [
    'Sources have `next` → links to pre-collector transformer chain (e.g., next: "transformerName")',
    'Destinations have `before` → links to post-collector transformer chain (e.g., before: "transformerName")',
    'Transformers have `next` → chains to next transformer (e.g., next: "anotherTransformer")',
    'Stores are passive — injected via `env` values using `$store:storeName` syntax',
    'Mapping on destinations uses nested entity → action structure: { "product": { "view": Rule, "add": Rule } }. Event name "product view" splits into entity "product", action "view". Read walkeros://reference/mapping for syntax.',
  ],
  platformOptions: {
    web: 'Browser environment — uses @walkeros/web-source-browser as default source',
    server:
      'Node.js environment — uses @walkeros/server-source-express as default source',
  },
  minimalExample: {
    version: 3,
    flows: {
      default: {
        web: {},
        packages: {
          '@walkeros/web-source-browser': {},
          '@walkeros/web-destination-gtag': { version: '3.0.0' },
        },
        sources: {
          browser: { package: '@walkeros/web-source-browser', config: {} },
        },
        destinations: {
          gtag: {
            package: '@walkeros/web-destination-gtag',
            config: {
              settings: { measurementId: 'G-XXXXXXXXXX' },
              mapping: {
                page: {
                  view: { name: 'page_view' },
                },
                product: {
                  add: {
                    name: 'add_to_cart',
                    data: { map: { value: 'data.price' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export function registerReferenceResources(server: McpServer) {
  // Flow Schema reference
  server.resource(
    'flow-schema',
    'walkeros://reference/flow-schema',
    {
      description:
        'Annotated Flow.Config structure reference with connection rules and minimal example',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'walkeros://reference/flow-schema',
          text: JSON.stringify(FLOW_SCHEMA_REFERENCE, null, 2),
          mimeType: 'application/json',
        },
      ],
    }),
  );

  // Event Model reference
  server.resource(
    'event-model',
    'walkeros://reference/event-model',
    {
      description:
        'walkerOS event structure: entity-action naming, properties (data, context, globals, nested, consent, user)',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'walkeros://reference/event-model',
          text: JSON.stringify(
            {
              naming:
                'Events use "entity action" format: "page view", "product add", "order complete"',
              minimalEvent: { name: 'page view', data: { title: 'Home' } },
              properties: {
                data: 'Entity-specific properties (product name, price, etc.)',
                context: 'State/environment info (page type, test group)',
                globals: 'Cross-event properties set once (language, currency)',
                nested: 'Nested entities (products inside an order)',
                user: 'User identifiers (id, device, session, hash)',
                consent:
                  'Granted permissions (functional, analytics, marketing)',
                custom: 'Application-specific data',
              },
              autoPopulated: [
                'timestamp',
                'timing',
                'group',
                'count',
                'version',
                'source',
                'entity',
                'action',
              ],
            },
            null,
            2,
          ),
          mimeType: 'application/json',
        },
      ],
    }),
  );

  // Mapping reference
  server.resource(
    'mapping',
    'walkeros://reference/mapping',
    {
      description:
        'walkerOS mapping syntax: data/map/loop/set/condition/consent/policy rules for event transformation',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'walkeros://reference/mapping',
          text: JSON.stringify(
            {
              overview:
                'Mapping transforms walkerOS events into vendor-specific formats. Same syntax on sources (input normalization) and destinations (output transformation).',
              config: {
                consent:
                  'Record<string, boolean> — destination-level consent requirements',
                data: 'Mapping.ValueConfig[] — field extraction rules',
                policy: 'Pre-processing rules applied before mapping',
                mapping:
                  'Record<entityAction, Mapping.Rule[]> — per-event mapping rules',
              },
              rules: {
                keying:
                  'Mapping uses NESTED entity → action structure. Event name splits by space: "product add" → entity "product", action "add". Keys are nested objects, NOT dot-separated strings.',
                structure:
                  '{ entity: { action: Rule | Rule[] } } — e.g., { "product": { "add": { name: "add_to_cart" } } }',
                wildcards:
                  'Use "*" at either level: { "*": { "view": Rule } } matches any entity with action "view"',
                priority:
                  'Exact match > entity wildcard > action wildcard > global wildcard (* → *)',
                example: {
                  product: {
                    add: [
                      {
                        name: 'add_to_cart',
                        data: { map: { value: 'data.price' } },
                      },
                    ],
                    view: [
                      {
                        name: 'view_item',
                        data: {
                          map: {
                            value: 'data.price',
                            currency: { value: 'EUR' },
                          },
                        },
                      },
                    ],
                  },
                  '*': { view: [{ name: 'page_view' }] },
                },
              },
              valueConfig: {
                key: 'Source property path (e.g., "data.title", "context.page")',
                value: 'Static value or fallback',
                fn: '$code:(event) => event.data.price * 100 — inline function',
                map: 'Record<string, ValueConfig> — object transformation',
                loop: 'Array iteration (e.g., loop nested entities)',
                set: 'Create array from multiple values',
                condition:
                  'Conditional inclusion: { if: "data.price", value: "paid" }',
                consent:
                  'Field-level consent: { key: "user.email", consent: { marketing: true } }',
                validate: 'Schema validation for the value',
              },
              codeFunction:
                '$code:(event, mapping, options) => expression — inline JavaScript. Access event data, mapping context, and options.',
              policyRules: {
                overview:
                  'Pre-processing rules applied before mapping transforms events',
                types: [
                  'consent — require specific consent before processing',
                  'ignore — skip events matching conditions',
                  'redact — remove sensitive fields',
                ],
              },
            },
            null,
            2,
          ),
          mimeType: 'application/json',
        },
      ],
    }),
  );

  // Consent reference
  server.resource(
    'consent',
    'walkeros://reference/consent',
    {
      description:
        'walkerOS consent model: destination-level, rule-level, and field-level consent gating',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'walkeros://reference/consent',
          text: JSON.stringify(
            {
              levels: {
                destination:
                  'config.consent: { marketing: true } — entire destination requires consent',
                rule: 'mapping.product.add.consent: { analytics: true } — specific mapping rule requires consent',
                field:
                  'data.map.email: { key: "user.email", consent: { marketing: true } } — individual field requires consent',
              },
              deferredInit: {
                require:
                  '["consent"] — destination waits for consent before initializing',
                queue:
                  'true (default) — events are queued while waiting for consent, replayed when granted',
              },
              collectorDefault:
                'Collector starts with empty consent state. Sources (CMP) push consent updates.',
              example: {
                destinations: {
                  gtag: {
                    package: '@walkeros/web-destination-gtag',
                    config: { measurementId: 'G-XXX' },
                    consent: { analytics: true },
                  },
                  meta: {
                    package: '@walkeros/web-destination-meta',
                    config: { pixelId: '123' },
                    consent: { marketing: true },
                  },
                },
              },
            },
            null,
            2,
          ),
          mimeType: 'application/json',
        },
      ],
    }),
  );

  // Variables reference
  server.resource(
    'variables',
    'walkeros://reference/variables',
    {
      description:
        'walkerOS variable patterns: $var, $env, $def, $contract, $code, $store substitution',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'walkeros://reference/variables',
          text: JSON.stringify(
            {
              patterns: {
                '$var.name':
                  'Variable substitution — cascade: step settings > flow settings > config variables',
                '$env.NAME':
                  'Environment variable — $env.GA_ID reads process.env.GA_ID',
                '$env.NAME:default':
                  'Environment variable with fallback — $env.GA_ID:G-DEFAULT',
                '$def.name':
                  'Definition reference — reusable config blocks from definitions section',
                '$def.name.path.deep':
                  'Nested definition access — $def.ga4Events.purchase',
                '$contract.name':
                  'Contract reference — links to named contract for validation',
                '$contract.name.path':
                  'Nested contract access — $contract.ecommerce.product',
                '$code:(expr)':
                  'Inline JavaScript — $code:(event) => event.data.price * 100',
                '$store:storeId':
                  'Store injection in env values — wires runtime store access',
              },
              cascade: {
                priority: [
                  '1. Step-level settings (highest)',
                  '2. Flow-level settings',
                  '3. Config-level variables (lowest)',
                ],
                example: {
                  variables: { apiKey: 'default-key' },
                  flows: {
                    production: {
                      destinations: {
                        api: {
                          config: { key: '$var.apiKey' },
                          settings: { apiKey: 'prod-key' },
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
          mimeType: 'application/json',
        },
      ],
    }),
  );

  // Contract reference
  server.resource(
    'contract',
    'walkeros://reference/contract',
    {
      description:
        'walkerOS contracts: event schema validation with entity-action keying, wildcards, and inheritance',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'walkeros://reference/contract',
          text: JSON.stringify(
            {
              overview:
                'Contracts define event schemas using entity-action keying. Used by the validator transformer to enforce data quality.',
              structure: {
                namedContracts:
                  'Top-level keys are contract names. Each is a ContractEntry with extends, tagging, events, globals, context, custom, user, consent.',
                tagging:
                  'number — contract version (inside each contract entry, not at top level)',
                events:
                  'Record<entity, Record<action, Schema>> — nested entity → action → JSON Schema',
                wildcards: {
                  '*': 'As entity key: matches all entities. As action key: matches all actions of that entity.',
                },
              },
              inheritance: {
                extends:
                  'Named contracts can extend other contracts: { extends: "base" }',
                merging:
                  'Child properties merge with parent. Child overrides take precedence.',
              },
              schema: {
                properties: {
                  data: 'JSON Schema for entity data properties',
                  globals: 'JSON Schema for global properties',
                  context: 'JSON Schema for context properties',
                  custom: 'JSON Schema for custom properties',
                  user: 'JSON Schema for user identifiers',
                  consent: 'Required consent state',
                },
              },
              reference:
                '$contract.name — use in flow config to reference a named contract',
              example: {
                ecommerce: {
                  tagging: 1,
                  events: {
                    product: {
                      '*': {
                        properties: {
                          data: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              price: { type: 'number' },
                            },
                            required: ['name'],
                          },
                        },
                      },
                    },
                    order: {
                      complete: {
                        properties: {
                          data: {
                            type: 'object',
                            properties: {
                              total: { type: 'number' },
                              orderId: { type: 'string' },
                            },
                            required: ['total', 'orderId'],
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
          mimeType: 'application/json',
        },
      ],
    }),
  );

  // API reference (OpenAPI spec)
  server.resource(
    'api',
    'walkeros://reference/api',
    {
      description: 'walkerOS cloud API — OpenAPI 3.1 specification',
      mimeType: 'application/json',
    },
    async () => {
      let openApiSpec: string;
      try {
        const { readFileSync } = await import('fs');
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const specPath = require.resolve('@walkeros/cli/openapi/spec.json');
        openApiSpec = readFileSync(specPath, 'utf-8');
      } catch {
        openApiSpec = JSON.stringify({ error: 'OpenAPI spec not found' });
      }
      return {
        contents: [
          {
            uri: 'walkeros://reference/api',
            text: openApiSpec,
            mimeType: 'application/json',
          },
        ],
      };
    },
  );

  // Packages catalog resource
  server.resource(
    'packages',
    'walkeros://reference/packages',
    {
      description:
        'Complete walkerOS package catalog — all sources, destinations, transformers, and stores',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'walkeros://reference/packages',
          text: JSON.stringify(PACKAGE_REGISTRY, null, 2),
          mimeType: 'application/json',
        },
      ],
    }),
  );
}
