// Mock @walkeros/cli to prevent loading chalk (ESM-only) transitively when
// the tools import the CLI's command surface. These structural assertions
// need no real implementations.
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

jest.mock('@walkeros/cli/dev', () => {
  const { z } = require('zod');
  const stringField = z.string().optional();
  const shape = new Proxy(
    {},
    {
      get: () => stringField,
    },
  );
  return {
    schemas: new Proxy(
      {},
      {
        get: () => shape,
      },
    ),
  };
});

// A real client handshake below fires the telemetry hook; keep it inert.
jest.mock('../telemetry.js', () => ({
  createMcpEmitter: jest.fn(async () => ({
    emitStart: jest.fn(async () => undefined),
    emitInvoke: jest.fn(async () => undefined),
    emitError: jest.fn(async () => undefined),
  })),
}));

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createWalkerOSMcpServer } from '../server.js';
import { createLocalRuntime } from '../runtime/local.js';
import { record } from './support/tool-result.js';

describe('createWalkerOSMcpServer', () => {
  it('returns an McpServer instance with server info and instructions set', () => {
    const server = createWalkerOSMcpServer({
      runtime: createLocalRuntime(),
      version: '9.9.9',
    });
    expect(server).toBeInstanceOf(McpServer);
    expect(server.server).toBeDefined();
  });

  it('registers the eight local tools', () => {
    const server = createWalkerOSMcpServer({
      runtime: createLocalRuntime(),
      version: '0.0.0',
    });
    const tools: unknown = Reflect.get(server, '_registeredTools');
    const registered = Object.keys(record(tools)).sort();
    expect(registered).toEqual(
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
});
