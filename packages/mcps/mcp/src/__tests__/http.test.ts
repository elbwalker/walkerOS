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

import { createWalkerOSMcpServer } from '../server.js';
import { createStreamableHttpHandler } from '../http.js';
import { stubClient } from './support/stub-client.js';

function mcpRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request('http://localhost/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('createStreamableHttpHandler', () => {
  it('responds to an initialize call and assigns a session id', async () => {
    const server = createWalkerOSMcpServer({
      client: stubClient(),
      version: '0.0.0',
    });
    const handler = createStreamableHttpHandler(server, {
      sessionIdGenerator: () => 'sess_test',
    });

    const response = await handler(
      mcpRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '0.0.0' },
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('mcp-session-id')).toBe('sess_test');
  });

  it('rejects non-initialize POST without session id', async () => {
    const server = createWalkerOSMcpServer({
      client: stubClient(),
      version: '0.0.0',
    });
    const handler = createStreamableHttpHandler(server, {
      sessionIdGenerator: () => 'sess_test',
    });

    const response = await handler(
      mcpRequest({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      }),
    );

    expect(response.status).toBe(400);
  });

  it('supports stateless mode when sessionIdGenerator is undefined', async () => {
    const server = createWalkerOSMcpServer({
      client: stubClient(),
      version: '0.0.0',
    });
    const handler = createStreamableHttpHandler(server, {});

    const response = await handler(
      mcpRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 't', version: '0' },
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('mcp-session-id')).toBeNull();
  });
});
