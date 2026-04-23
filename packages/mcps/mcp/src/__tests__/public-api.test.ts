jest.mock('@walkeros/cli', () => ({
  validate: jest.fn(),
  bundle: jest.fn(),
  simulate: jest.fn(),
  push: jest.fn(),
  examples: jest.fn(),
  flowLoad: jest.fn(),
  loadFlow: jest.fn(),
  // HttpToolClient delegates
  listProjects: jest.fn(),
  getProject: jest.fn(),
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  setDefaultProject: jest.fn(),
  getDefaultProject: jest.fn(),
  listAllFlows: jest.fn(),
  listFlows: jest.fn(),
  getFlow: jest.fn(),
  createFlow: jest.fn(),
  updateFlow: jest.fn(),
  deleteFlow: jest.fn(),
  duplicateFlow: jest.fn(),
  listPreviews: jest.fn(),
  getPreview: jest.fn(),
  createPreview: jest.fn(),
  deletePreview: jest.fn(),
  deploy: jest.fn(),
  listDeployments: jest.fn(),
  getDeploymentBySlug: jest.fn(),
  deleteDeployment: jest.fn(),
  requestDeviceCode: jest.fn(),
  pollForToken: jest.fn(),
  whoami: jest.fn(),
  resolveToken: jest.fn(),
  deleteConfig: jest.fn(),
  feedback: jest.fn(),
  getFeedbackPreference: jest.fn(),
  setFeedbackPreference: jest.fn(),
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

import * as api from '../index.js';

describe('public API surface', () => {
  it('exports createWalkerOSMcpServer', () => {
    expect(typeof api.createWalkerOSMcpServer).toBe('function');
  });

  it('exports HttpToolClient', () => {
    expect(typeof api.HttpToolClient).toBe('function');
  });

  it('exports createStreamableHttpHandler', () => {
    expect(typeof api.createStreamableHttpHandler).toBe('function');
  });

  it('exports TOOL_DEFINITIONS array', () => {
    expect(Array.isArray(api.TOOL_DEFINITIONS)).toBe(true);
    expect(api.TOOL_DEFINITIONS.length).toBe(13);
  });

  it('does not auto-start stdio on import (smoke: import completes without side effects)', () => {
    // If stdio.ts were imported from index.ts, the test runner would hang
    // on process.stdin. Reaching this line means we're clean.
    expect(true).toBe(true);
  });
});
