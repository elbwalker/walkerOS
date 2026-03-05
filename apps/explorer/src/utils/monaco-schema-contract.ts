// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySchema = Record<string, any>;

/**
 * Returns an enriched JSON Schema for the walkerOS Contract editor.
 * Structure: { $tagging: number, entity: { action: JSONSchema } }
 */
export function getEnrichedContractSchema(): AnySchema {
  return {
    type: 'object',
    markdownDescription:
      'walkerOS Data Contract. Defines entity→action schemas for event validation.\n\n' +
      '```json\n{\n  "$tagging": 1,\n  "page": {\n' +
      '    "view": {\n      "type": "object",\n      "properties": {\n' +
      '      "title": { "type": "string" }\n    }\n  }\n  }\n}\n```',
    properties: {
      $tagging: {
        type: 'number',
        markdownDescription:
          'Contract version number. Increment when making breaking changes.\n\n```json\n"$tagging": 1\n```',
      },
    },
    additionalProperties: {
      type: 'object',
      markdownDescription: 'Entity name. Contains action→schema mappings.',
      additionalProperties: {
        type: 'object',
        markdownDescription:
          'Action schema (JSON Schema). Defines valid event data for this entity+action.\n\n' +
          '```json\n{\n  "type": "object",\n  "properties": {\n' +
          '    "name": { "type": "string" },\n    "price": { "type": "number" }\n' +
          '  },\n  "required": ["name"]\n}\n```',
        defaultSnippets: [
          {
            label: 'Object schema',
            description: 'Schema with typed properties',
            body: {
              type: 'object',
              properties: {
                '${1:name}': { type: '${2:string}' },
              },
            },
          },
        ],
      },
      defaultSnippets: [
        {
          label: 'Add action',
          description: 'Action with event data schema',
          body: {
            '${1:action}': {
              type: 'object',
              properties: {
                '${2:property}': { type: '${3:string}' },
              },
            },
          },
        },
      ],
    },
    defaultSnippets: [
      {
        label: 'Entity with action',
        description: 'New entity with one action and properties',
        body: {
          '${1:entity}': {
            '${2:action}': {
              type: 'object',
              properties: {
                '${3:property}': { type: '${4:string}' },
              },
            },
          },
        },
      },
    ],
  };
}
