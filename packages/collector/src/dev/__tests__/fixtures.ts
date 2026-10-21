import path from 'path';
import type { Flow } from '@walkeros/core';
import type { JSONSchema } from '@walkeros/core/dev';

export const schema: JSONSchema = {
  type: 'object',
  properties: { url: { type: 'string' } },
  required: ['url'],
  additionalProperties: false,
};

export const examples: Flow.StepExamples = {
  pageView: {
    in: { name: 'page view', data: { title: 'Home' }, user: { id: 'user-1' } },
    out: [
      [
        'fetch',
        'https://127.0.0.1:9/e',
        { method: 'POST', body: '{"name":"page view"}' },
      ],
    ],
  },
  silent: {
    public: false,
    description: 'A silent rule sends nothing: the rule settings say so.',
    in: { name: 'page view', data: { title: 'Home' }, user: { id: 'user-1' } },
    mapping: { silent: true },
    out: [],
  },
};

export const fixtures = {
  schema,
  examples,
  settings: { url: 'https://127.0.0.1:9/e' },
  root: path.join(__dirname, 'fixture-package'),
};
