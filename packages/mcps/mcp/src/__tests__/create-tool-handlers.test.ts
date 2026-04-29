jest.mock('@walkeros/cli', () => ({
  validate: jest.fn(),
  bundle: jest.fn(),
  simulate: jest.fn(),
  push: jest.fn(),
  examples: jest.fn(),
  flowLoad: jest.fn(),
  loadFlow: jest.fn(),
}));

import { createToolHandlers } from '../index.js';
import { stubClient } from './support/stub-client.js';

describe('createToolHandlers', () => {
  it('returns specs for all 13 tools keyed by name', () => {
    const specs = createToolHandlers(stubClient());
    expect(Object.keys(specs).sort()).toEqual(
      [
        'auth',
        'deploy_manage',
        'feedback',
        'flow_bundle',
        'flow_examples',
        'flow_load',
        'flow_manage',
        'flow_push',
        'flow_simulate',
        'flow_validate',
        'package_get',
        'package_search',
        'project_manage',
      ].sort(),
    );
  });

  it('each spec has name, title, description, inputSchema, annotations, handler', () => {
    const specs = createToolHandlers(stubClient());
    for (const [key, spec] of Object.entries(specs)) {
      expect(spec.name).toBe(key);
      expect(typeof spec.title).toBe('string');
      expect(typeof spec.description).toBe('string');
      expect(spec.inputSchema).toBeDefined();
      expect(spec.annotations).toBeDefined();
      expect(typeof spec.handler).toBe('function');
    }
  });
});
