// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySchema = Record<string, any>;

/**
 * Takes the base Flow.Json JSON Schema (from @walkeros/core z.toJSONSchema())
 * and returns an enriched version with Monaco-specific extensions.
 *
 * The actual schema uses { allOf: [{ $ref: '#/definitions/FlowJson' }], definitions: {...} }.
 * Root walkeros.config.json properties live under definitions.FlowJson.properties.
 * Per-flow properties live under definitions.Flow.properties.
 */
export function enrichFlowConfigSchema(baseSchema: AnySchema): AnySchema {
  // Deep clone to avoid mutating the input.
  const schema = JSON.parse(JSON.stringify(baseSchema));

  const root = schema.definitions?.FlowJson;
  const flowDef = schema.definitions?.Flow;
  const flowConfigDef = schema.definitions?.FlowConfig;

  if (!root?.properties) return schema;

  const props = root.properties;
  const flowProps = flowDef?.properties;
  const flowConfigProps = flowConfigDef?.properties;

  // Enrich version
  if (props.version) {
    props.version.markdownDescription =
      'Schema version number. Use `4` for the current format.\n\n```json\n"version": 4\n```';
  }

  // Enrich $schema
  if (props.$schema) {
    props.$schema.markdownDescription =
      'JSON Schema URI for IDE validation.\n\n```json\n"$schema": "https://walkeros.io/schema/flow/v4.json"\n```';
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
      '```json\n"flows": {\n  "myFlow": {\n    "config": { "platform": "web" },\n    "sources": { ... },\n    "destinations": { ... }\n  }\n}\n```';
    props.flows.defaultSnippets = [
      {
        label: 'Web flow (basic)',
        description: 'Minimal web flow with browser source',
        body: {
          '${1:myFlow}': {
            config: { platform: 'web' },
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
            config: { platform: 'server' },
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
            config: { platform: 'web' },
            sources: {
              browser: { package: '@walkeros/web-source-browser' },
            },
            destinations: {
              ga4: {
                package: '@walkeros/web-destination-gtag',
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

  // Enrich per-Flow sub-properties (definitions.Flow.properties)
  if (flowProps) {
    if (flowProps.config) {
      flowProps.config.markdownDescription =
        'Per-flow configuration: platform identity, optional public URL, free-form settings, bundle.\n\n' +
        '```json\n"config": {\n  "platform": "web",\n  "settings": {\n    "windowCollector": "collector"\n  }\n}\n```';
      flowProps.config.defaultSnippets = [
        {
          label: 'Web platform config',
          description: 'Browser-based flow configuration',
          body: { platform: 'web' },
        },
        {
          label: 'Server platform config',
          description: 'Node.js flow configuration',
          body: { platform: 'server' },
        },
      ];
    }

    if (flowProps.sources) {
      flowProps.sources.markdownDescription =
        'Source configurations for data capture, keyed by step name.\n\n' +
        '```json\n"sources": {\n  "browser": { "package": "@walkeros/web-source-browser" }\n}\n```';
      flowProps.sources.defaultSnippets = [
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

    if (flowProps.destinations) {
      flowProps.destinations.markdownDescription =
        'Destination configurations for data output, keyed by step name.\n\n' +
        '```json\n"destinations": {\n  "ga4": {\n    "package": "@walkeros/web-destination-ga4",\n    "config": { "measurementId": "$var.trackingId" }\n  }\n}\n```';
      flowProps.destinations.defaultSnippets = [
        {
          label: 'Add GA4 destination',
          description: 'Google Analytics 4 destination',
          body: {
            '${1:ga4}': {
              package: '@walkeros/web-destination-gtag',
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

    if (flowProps.transformers) {
      flowProps.transformers.markdownDescription =
        'Transformer configurations for event transformation, keyed by step name.\n\n' +
        '```json\n"transformers": {\n  "validator": {\n    "code": { "push": "$code:(event) => event" }\n  }\n}\n```';
      flowProps.transformers.defaultSnippets = [
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
  }

  // Enrich Flow.Config sub-properties (definitions.FlowConfig.properties)
  if (flowConfigProps) {
    if (flowConfigProps.platform) {
      flowConfigProps.platform.markdownDescription =
        'Platform identity for this flow.\n\n' +
        '- `web` builds to IIFE format, ES2020 target, browser platform.\n' +
        '- `server` builds to ESM format, Node18 target, node platform.\n\n' +
        '```json\n"platform": "web"\n```';
    }

    if (flowConfigProps.url) {
      flowConfigProps.url.markdownDescription =
        'Public URL where this flow is reachable. Used for cross-flow `$flow.X.url` references.\n\n' +
        '```json\n"url": "https://collect.example.com"\n```';
    }

    if (flowConfigProps.settings) {
      flowConfigProps.settings.markdownDescription =
        'Free-form key-value settings consumed by the platform runtime.\n\n' +
        'For web: typical keys include `windowCollector`, `windowElb`.\n\n' +
        '```json\n"settings": {\n  "windowCollector": "collector",\n  "windowElb": "elb"\n}\n```';
    }

    if (flowConfigProps.bundle) {
      flowConfigProps.bundle.markdownDescription =
        'Bundle configuration: NPM packages to include and transitive dependency overrides.\n\n' +
        '```json\n"bundle": {\n  "packages": {\n    "@walkeros/web-source-browser": { "version": "^2.0.0" }\n  }\n}\n```';
    }
  }

  return schema;
}
