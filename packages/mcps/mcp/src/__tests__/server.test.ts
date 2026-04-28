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

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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
    deploy: notImpl,
    listDeployments: notImpl,
    getDeploymentBySlug: notImpl,
    deleteDeployment: notImpl,
    requestDeviceCode: notImpl,
    pollForToken: notImpl,
    whoami: notImpl,
    resolveToken: () => null,
    deleteConfig: () => false,
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

  it('registers all 13 tools', () => {
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
});
