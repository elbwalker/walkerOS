import './support/version.js';

jest.mock('../telemetry.js', () => ({ createMcpEmitter: jest.fn() }));

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpEmitter, type McpEmitter } from '../telemetry.js';
import {
  createWalkerOSMcpServer,
  trackInvoke,
  __resetMcpEmitterSingletonForTesting,
} from '../server.js';

const emitStart = jest.fn(async () => {});
const emitInvoke = jest.fn(
  async (_tool: string, _outcome: 'success' | 'error', _timingMs: number) => {},
);
const emitError = jest.fn(async () => {});
const emitter: McpEmitter = { emitStart, emitInvoke, emitError };

/** Let the oninitialized hook and a settled call finish their async emits. */
const settle = () =>
  new Promise<void>((resolve) => setImmediate(resolve)).then(
    () => new Promise<void>((resolve) => setImmediate(resolve)),
  );

beforeEach(() => {
  __resetMcpEmitterSingletonForTesting();
  jest.mocked(createMcpEmitter).mockResolvedValue(emitter);
});

describe('tool call tracking through a connected client', () => {
  it.each<[string, Record<string, unknown>, boolean, 'success' | 'error']>([
    ['an isError answer as error', {}, true, 'error'],
    ['a normal answer as success', { platform: 'web' }, false, 'success'],
  ])('records %s', async (_label, args, isError, outcome) => {
    const server = createWalkerOSMcpServer({
      runtime: { load: async () => ({}) },
      version: '0.0.0-test',
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'claude-code', version: '2.0' });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
    try {
      await settle();
      const result = await client.callTool({
        name: 'flow_load',
        arguments: args,
      });
      expect(result.isError === true).toBe(isError);
      await settle();
      expect(emitInvoke).toHaveBeenCalledWith(
        'flow_load',
        outcome,
        expect.any(Number),
      );
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  });

  it('creates the emitter with the client info and emits mcp start', async () => {
    const server = createWalkerOSMcpServer({
      runtime: { load: async () => ({}) },
      version: '3.4.2',
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'claude-ai', version: '1.0.0' });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
    try {
      await settle();
      expect(createMcpEmitter).toHaveBeenCalledWith({
        clientInfo: { name: 'claude-ai', version: '1.0.0' },
        packageVersion: '3.4.2',
      });
      expect(emitStart).toHaveBeenCalledTimes(1);
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  });
});

describe('trackInvoke', () => {
  it('records a throw as error and re-throws it unchanged', async () => {
    const boom = new Error('boom');
    await expect(
      trackInvoke(
        'flow_push',
        async () => Promise.reject(boom),
        () => emitter,
      ),
    ).rejects.toBe(boom);
    expect(emitInvoke).toHaveBeenCalledWith(
      'flow_push',
      'error',
      expect.any(Number),
    );
  });

  it('never lets a failing emit reach the caller', async () => {
    emitInvoke.mockRejectedValueOnce(new Error('telemetry down'));
    await expect(
      trackInvoke(
        'flow_load',
        async () => ({ content: [] }),
        () => emitter,
      ),
    ).resolves.toEqual({ content: [] });
  });
});
