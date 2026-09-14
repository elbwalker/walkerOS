// Mock @walkeros/cli to prevent loading chalk (ESM-only) transitively when
// tool register fns import the CLI's command surface. The factory itself
// uses an injected ToolClient; the local-only tools that still import CLI
// helpers don't need real implementations for these structural assertions.
jest.mock('@walkeros/cli', () => ({
  validate: jest.fn(),
  bundle: jest.fn(),
  simulate: jest.fn(),
  push: jest.fn(),
  examples: jest.fn(),
  flowLoad: jest.fn(),
  loadFlow: jest.fn(),
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
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createWalkerOSMcpServer } from '../server.js';
import type { ToolClient } from '../tool-client.js';

function stubClient(): ToolClient {
  const notImpl = async () => {
    throw new Error('not implemented in stub');
  };
  return {
    listProjects: notImpl,
    getProject: notImpl,
    createProject: notImpl,
    updateProject: notImpl,
    deleteProject: notImpl,
    setDefaultProject: () => {},
    getDefaultProject: () => null,
    listAllFlows: notImpl,
    listFlows: notImpl,
    getFlow: notImpl,
    createFlow: notImpl,
    updateFlow: notImpl,
    deleteFlow: notImpl,
    duplicateFlow: notImpl,
    listPreviews: notImpl,
    getPreview: notImpl,
    createPreview: notImpl,
    deletePreview: notImpl,
    listSecrets: notImpl,
    createSecret: notImpl,
    updateSecret: notImpl,
    deleteSecret: notImpl,
    deploy: notImpl,
    listDeployments: notImpl,
    getDeploymentBySlug: notImpl,
    deleteDeployment: notImpl,
    listJourneys: notImpl,
    listReleases: notImpl,
    getRelease: notImpl,
    listStepHistory: notImpl,
    setReleaseRationale: notImpl,
    listThreads: notImpl,
    createThread: notImpl,
    addThreadMessage: notImpl,
    listKnowledge: notImpl,
    listFrames: notImpl,
    listPageFrames: notImpl,
    getFrame: notImpl,
    requestDeviceCode: notImpl,
    pollForToken: notImpl,
    whoami: notImpl,
    credentialSource: () => null,
    logout: async () => ({ deleted: false }),
    appBaseUrl: () => 'https://app.walkeros.io',
    checkHealth: async () => ({ reachable: true }),
    submitFeedback: notImpl,
    getFeedbackPreference: () => undefined,
    setFeedbackPreference: () => {},
  };
}

describe('createWalkerOSMcpServer', () => {
  it('returns an McpServer instance with server info and instructions set', () => {
    const server = createWalkerOSMcpServer({
      client: stubClient(),
      version: '9.9.9',
    });
    expect(server).toBeInstanceOf(McpServer);
    expect(server.server).toBeDefined();
  });

  it('registers all 19 tools', () => {
    const server = createWalkerOSMcpServer({
      client: stubClient(),
      version: '0.0.0',
    });
    const registered = Object.keys(
      (server as unknown as { _registeredTools: Record<string, unknown> })
        ._registeredTools,
    ).sort();
    expect(registered).toEqual(
      [
        'auth',
        'deploy_manage',
        'diagnostics',
        'feedback',
        'flow_bundle',
        'flow_examples',
        'flow_load',
        'flow_manage',
        'flow_push',
        'flow_simulate',
        'flow_validate',
        'frame_manage',
        'hub_manage',
        'observe_journeys',
        'observe_session',
        'package_get',
        'package_search',
        'project_manage',
        'secret_manage',
      ].sort(),
    );
  });

  it('uses the hosted runtime when runtime is omitted', async () => {
    const server = createWalkerOSMcpServer({
      client: stubClient(),
      version: '0.0.0',
    });
    // Through the public protocol surface, not the SDK's private registry.
    const [serverTransport, clientTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0' });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
    try {
      const res = await client.callTool({
        name: 'flow_simulate',
        arguments: {
          configPath: '{"version":4,"flows":{}}',
          step: 'destination.x',
          event: { name: 'order complete' },
        },
      });
      expect(res.isError).toBe(true);
      expect(JSON.stringify(res.content)).toMatch(/hosted/i);
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  });
});
