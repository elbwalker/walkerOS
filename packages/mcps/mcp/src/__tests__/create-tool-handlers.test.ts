jest.mock('@walkeros/cli', () => ({
  bundle: jest.fn(),
  push: jest.fn(),
  loadJsonConfig: jest.fn(),
  loadConfig: jest.fn(),
  collectKnownSecrets: jest.fn(),
  simulateSource: jest.fn(),
  simulateTransformer: jest.fn(),
  simulateCollector: jest.fn(),
  simulateDestination: jest.fn(),
}));

import { createToolHandlers } from '../index.js';
import { createLocalRuntime } from '../runtime/local.js';
import { isErrorResult, textOf } from './support/tool-result.js';

describe('createToolHandlers', () => {
  it('returns specs for the eight local tools keyed by name', () => {
    const specs = createToolHandlers(createLocalRuntime());
    expect(Object.keys(specs).sort()).toEqual(
      [
        'flow_bundle',
        'flow_examples',
        'flow_load',
        'flow_push',
        'flow_simulate',
        'flow_validate',
        'package_get',
        'package_search',
      ].sort(),
    );
  });

  it('each spec has name, title, description, inputSchema, annotations, handler', () => {
    const specs = createToolHandlers(createLocalRuntime());
    for (const [key, spec] of Object.entries(specs)) {
      expect(spec.name).toBe(key);
      expect(typeof spec.title).toBe('string');
      expect(typeof spec.description).toBe('string');
      expect(spec.inputSchema).toBeDefined();
      expect(spec.annotations).toBeDefined();
      expect(typeof spec.handler).toBe('function');
    }
  });

  it('a runtime with load only refuses to simulate, naming no hosted server', async () => {
    const specs = createToolHandlers({ load: async () => ({}) });
    const res = await specs.flow_simulate.handler({
      configPath: '{"version":4,"flows":{}}',
      step: 'destination.x',
      event: { name: 'order complete' },
    });
    expect(isErrorResult(res)).toBe(true);
    expect(textOf(res)).toMatch(/not available on this server/);
    expect(textOf(res)).not.toMatch(/hosted/i);
  });
});
