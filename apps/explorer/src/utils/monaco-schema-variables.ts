// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySchema = Record<string, any>;

export function getVariablesSchema(): AnySchema {
  return {
    type: 'object',
    markdownDescription:
      'Flow variables for `$var.name` interpolation. Values must be string, number, or boolean.\n\n' +
      '```json\n{\n  "measurementId": "G-XXXXXXXXXX",\n  "debug": false,\n  "batchSize": 10\n}\n```\n\n' +
      'Reference in any config value: `"$var.measurementId"`',
    additionalProperties: {
      oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
    },
    defaultSnippets: [
      {
        label: 'Add string variable',
        body: { '${1:name}': '${2:value}' },
      },
      {
        label: 'Add boolean variable',
        body: { '${1:name}': '${2|true,false|}' },
      },
      {
        label: 'Add number variable',
        body: { '${1:name}': 0 },
      },
    ],
  };
}
