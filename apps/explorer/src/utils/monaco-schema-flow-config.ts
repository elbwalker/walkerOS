import { enrichSchema } from './monaco-schema-enrichment';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySchema = Record<string, any>;

/**
 * Takes the base Flow.Config JSON Schema (from @walkeros/core z.toJSONSchema())
 * and returns an enriched version with Monaco-specific extensions.
 *
 * The actual schema uses anyOf[0] at the top level.
 */
export function enrichFlowConfigSchema(baseSchema: AnySchema): AnySchema {
  // The schema structure is { anyOf: [{ type: 'object', properties: {...} }] }
  // We need to enrich inside anyOf[0]
  const schema = JSON.parse(JSON.stringify(baseSchema));

  if (!schema.anyOf?.[0]?.properties) return schema;

  const root = schema.anyOf[0];
  const props = root.properties;
  const flowSettings = props.flows?.additionalProperties?.properties;

  // Enrich version
  if (props.version) {
    props.version.markdownDescription =
      'Schema version number. Must be `1` for the current format.\n\n```json\n"version": 1\n```';
  }

  // Enrich $schema
  if (props.$schema) {
    props.$schema.markdownDescription =
      'JSON Schema URI for IDE validation.\n\n```json\n"$schema": "https://walkeros.io/schema/flow/v1.json"\n```';
  }

  // Enrich include
  if (props.include) {
    props.include.markdownDescription =
      'Folders to include in the bundle output.\n\n```json\n"include": ["./src", "./lib"]\n```';
  }

  // Enrich variables
  if (props.variables) {
    props.variables.markdownDescription =
      'Shared variables for `$var.name` interpolation across all flows.\n\n' +
      '```json\n"variables": {\n  "measurementId": "G-XXXXXXXXXX",\n  "debug": false\n}\n```\n\n' +
      'Reference in any config value: `"$var.measurementId"`';
    props.variables.defaultSnippets = [
      {
        label: 'Add variable',
        description: 'New key-value variable',
        body: { '${1:name}': '${2:value}' },
      },
    ];
  }

  // Enrich definitions
  if (props.definitions) {
    props.definitions.markdownDescription =
      'Reusable configuration fragments for `$def.name` references.\n\n' +
      '```json\n"definitions": {\n  "gaConfig": {\n    "measurementId": "$var.trackingId"\n  }\n}\n```\n\n' +
      'Reference in any config: `"$def.gaConfig"`';
    props.definitions.defaultSnippets = [
      {
        label: 'Add definition',
        description: 'New reusable config fragment',
        body: { '${1:name}': { '${2:key}': '${3:value}' } },
      },
    ];
  }

  // Enrich flows with scaffolding snippets
  if (props.flows) {
    props.flows.markdownDescription =
      'Flow configurations keyed by name. Each flow defines a complete event pipeline.\n\n' +
      '```json\n"flows": {\n  "myFlow": {\n    "web": {},\n    "sources": { ... },\n    "destinations": { ... }\n  }\n}\n```';
    props.flows.defaultSnippets = [
      {
        label: 'Web flow (basic)',
        description: 'Minimal web flow with browser source',
        body: {
          '${1:myFlow}': {
            web: {},
            sources: {
              browser: { package: '@walkeros/web-source-browser' },
            },
            destinations: {},
          },
        },
      },
      {
        label: 'Server flow (basic)',
        description: 'Minimal server flow with Express source',
        body: {
          '${1:myFlow}': {
            server: {},
            sources: {
              express: { package: '@walkeros/server-source-express' },
            },
            destinations: {},
          },
        },
      },
      {
        label: 'Web + GA4 flow',
        description: 'Web flow with browser source and GA4 destination',
        body: {
          '${1:myFlow}': {
            web: {},
            sources: {
              browser: { package: '@walkeros/web-source-browser' },
            },
            destinations: {
              ga4: {
                package: '@walkeros/web-destination-ga4',
                config: {
                  measurementId: '$var.${2:measurementId}',
                },
              },
            },
          },
        },
      },
    ];
  }

  // Enrich FlowSettings sub-properties
  if (flowSettings) {
    if (flowSettings.sources) {
      flowSettings.sources.markdownDescription =
        'Source configurations for data capture, keyed by step name.\n\n' +
        '```json\n"sources": {\n  "browser": { "package": "@walkeros/web-source-browser" }\n}\n```';
      flowSettings.sources.defaultSnippets = [
        {
          label: 'Add web source',
          description: 'Browser source for web tracking',
          body: {
            '${1:browser}': {
              package: '@walkeros/web-source-browser',
            },
          },
        },
        {
          label: 'Add server source',
          description: 'Express source for server tracking',
          body: {
            '${1:express}': {
              package: '@walkeros/server-source-express',
            },
          },
        },
      ];
    }

    if (flowSettings.destinations) {
      flowSettings.destinations.markdownDescription =
        'Destination configurations for data output, keyed by step name.\n\n' +
        '```json\n"destinations": {\n  "ga4": {\n    "package": "@walkeros/web-destination-ga4",\n    "config": { "measurementId": "$var.trackingId" }\n  }\n}\n```';
      flowSettings.destinations.defaultSnippets = [
        {
          label: 'Add GA4 destination',
          description: 'Google Analytics 4 destination',
          body: {
            '${1:ga4}': {
              package: '@walkeros/web-destination-ga4',
              config: {
                measurementId: '$var.${2:measurementId}',
              },
            },
          },
        },
        {
          label: 'Add custom destination',
          description: 'Custom destination with inline code',
          body: {
            '${1:custom}': {
              code: {
                push: '$code:(event) => { ${2:// handle event} }',
              },
            },
          },
        },
      ];
    }

    if (flowSettings.transformers) {
      flowSettings.transformers.markdownDescription =
        'Transformer configurations for event transformation, keyed by step name.\n\n' +
        '```json\n"transformers": {\n  "validator": {\n    "code": { "push": "$code:(event) => event" }\n  }\n}\n```';
      flowSettings.transformers.defaultSnippets = [
        {
          label: 'Add transformer',
          description: 'Inline transformer with code',
          body: {
            '${1:transformer}': {
              code: {
                push: '$code:(event) => { ${2:return event;} }',
              },
            },
          },
        },
      ];
    }

    if (flowSettings.web) {
      flowSettings.web.markdownDescription =
        'Web platform configuration (browser-based). Mutually exclusive with `server`.\n\n' +
        '```json\n"web": {\n  "windowCollector": "collector",\n  "windowElb": "elb"\n}\n```';
    }

    if (flowSettings.server) {
      flowSettings.server.markdownDescription =
        'Server platform configuration (Node.js). Mutually exclusive with `web`.\n\n' +
        '```json\n"server": {}\n```';
    }
  }

  return schema;
}
