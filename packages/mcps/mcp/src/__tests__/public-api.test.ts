jest.mock('@walkeros/cli', () => ({
  validate: jest.fn(),
  bundle: jest.fn(),
  push: jest.fn(),
  loadJsonConfig: jest.fn(),
  loadConfig: jest.fn(),
  collectKnownSecrets: jest.fn(),
  simulateSource: jest.fn(),
  simulateTransformer: jest.fn(),
  simulateCollector: jest.fn(),
  simulateDestination: jest.fn(),
  telemetry: { createEmitter: jest.fn(), getCiInfo: jest.fn() },
}));

import * as api from '../index.js';

describe('public API surface', () => {
  it('exports exactly the local server, its tools and the envelope helpers', () => {
    expect(Object.keys(api).sort()).toEqual(
      [
        'KNOWLEDGE_RESOURCES',
        'PROMPTS',
        'RuntimeRefusal',
        'STRUCTURAL_KEYS',
        'createLocalRuntime',
        'createLocalToolSpecs',
        'createToolHandlers',
        'createWalkerOSMcpServer',
        'keepStructural',
        'redactDisplayNames',
        'redactNestedStrings',
        'wrapListedRecord',
        'wrapUserData',
      ].sort(),
    );
  });

  it('does not auto-start stdio on import', () => {
    // Importing stdio.ts from index.ts would hang the runner on stdin.
    expect(typeof api.createWalkerOSMcpServer).toBe('function');
  });
});
