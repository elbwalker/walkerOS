import { registerFlowSimulateTool } from '../../tools/simulate.js';

jest.mock('@walkeros/cli/dev', () => ({
  schemas: {
    SimulateInputShape: {
      configPath: { type: 'string' },
      event: { type: 'string' },
      flow: { type: 'string' },
      platform: { type: 'string' },
      step: { type: 'string' },
    },
  },
}));

// The cache lives in its own module so we can stub the heavy bundle producer
// without touching the CLI. Each call writes a sentinel file at the bundlePath
// it is told to use and returns nothing (matching the real `bundle()` shape:
// it writes the artifact to `buildOverrides.output`).
const bundleMock = jest.fn(
  async (
    _config: unknown,
    options: { buildOverrides?: { output?: string } },
  ) => {
    const output = options.buildOverrides?.output;
    if (output) {
      const fs = await import('node:fs/promises');
      await fs.writeFile(output, '// stub bundle', 'utf-8');
    }
    return undefined;
  },
);

jest.mock('@walkeros/cli', () => ({
  bundle: (...args: unknown[]) =>
    bundleMock(args[0], args[1] as { buildOverrides?: { output?: string } }),
  simulateSource: jest.fn(),
  simulateTransformer: jest.fn(),
  simulateDestination: jest.fn(),
}));

jest.mock('@walkeros/core', () => ({
  mcpResult: jest.fn((result, hints) => ({
    structuredContent: hints ? { ...result, _hints: hints } : result,
    content: [{ type: 'text', text: JSON.stringify(result) }],
  })),
  mcpError: jest.fn((error) => ({
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
    ],
  })),
}));

import { simulateDestination } from '@walkeros/cli';
import { stubClient } from '../support/stub-client.js';
import {
  __resetBundleCacheForTests,
  getOrBuildBundle,
} from '../../tools/bundle-cache.js';

const mockSimulateDestination = jest.mocked(simulateDestination);

function createMockServer() {
  const tools: Record<string, { config: unknown; handler: Function }> = {};
  return {
    registerTool(name: string, config: unknown, handler: Function) {
      tools[name] = { config, handler };
    },
    getTool(name: string) {
      return tools[name];
    },
  };
}

function destResult() {
  return {
    step: 'destination' as const,
    name: 'gtag',
    events: [],
    calls: [{ fn: 'window.gtag', args: ['event'], ts: 1 }],
    duration: 5,
  };
}

describe('flow_simulate bundle cache', () => {
  let server: ReturnType<typeof createMockServer>;
  let getFlow: jest.Mock;

  beforeEach(async () => {
    server = createMockServer();
    getFlow = jest.fn();
    registerFlowSimulateTool(server as never, stubClient({ getFlow }));
    jest.clearAllMocks();
    await __resetBundleCacheForTests();
    mockSimulateDestination.mockResolvedValue(destResult());
  });

  afterEach(async () => {
    await __resetBundleCacheForTests();
  });

  it('bundles once for two simulate calls with the same config, reuses bundlePath', async () => {
    const tool = server.getTool('flow_simulate');
    const config = '{"version":4,"flows":{"default":{}}}';

    await tool.handler({
      configPath: config,
      event: '{"name":"page view"}',
      step: 'destination.gtag',
    });
    await tool.handler({
      configPath: config,
      event: '{"name":"page view"}',
      step: 'destination.gtag',
    });

    // Bundler invoked exactly once across both calls.
    expect(bundleMock).toHaveBeenCalledTimes(1);

    // Both simulate calls received the same prebuilt bundlePath.
    expect(mockSimulateDestination).toHaveBeenCalledTimes(2);
    const firstOpts = mockSimulateDestination.mock.calls[0][2];
    const secondOpts = mockSimulateDestination.mock.calls[1][2];
    expect(firstOpts.bundlePath).toBeDefined();
    expect(typeof firstOpts.bundlePath).toBe('string');
    expect(secondOpts.bundlePath).toBe(firstOpts.bundlePath);
  });

  it('bypasses the cache for a local file-path configPath (no bundle, no bundlePath)', async () => {
    const tool = server.getTool('flow_simulate');

    await tool.handler({
      configPath: './flow.json',
      event: '{"name":"page view"}',
      step: 'destination.gtag',
    });

    // A file path edited mid-session must not be served from a stale bundle, so
    // it never enters the cache: the bundler is not invoked and the simulate fn
    // runs in build-mode with no bundlePath.
    expect(bundleMock).not.toHaveBeenCalled();
    expect(mockSimulateDestination).toHaveBeenCalledTimes(1);
    expect(mockSimulateDestination.mock.calls[0][2].bundlePath).toBeUndefined();
  });

  it('returns undefined from getOrBuildBundle for path-like input', async () => {
    expect(await getOrBuildBundle('./flow.json')).toBeUndefined();
    expect(
      await getOrBuildBundle('https://example.com/flow.json'),
    ).toBeUndefined();
    expect(await getOrBuildBundle('walkeros.config.json')).toBeUndefined();
    expect(bundleMock).not.toHaveBeenCalled();
  });

  it('rebuilds when the config content changes', async () => {
    const tool = server.getTool('flow_simulate');

    await tool.handler({
      configPath: '{"version":4,"flows":{"default":{}}}',
      event: '{"name":"page view"}',
      step: 'destination.gtag',
    });
    await tool.handler({
      configPath: '{"version":4,"flows":{"default":{"x":1}}}',
      event: '{"name":"page view"}',
      step: 'destination.gtag',
    });

    expect(bundleMock).toHaveBeenCalledTimes(2);
    const firstOpts = mockSimulateDestination.mock.calls[0][2];
    const secondOpts = mockSimulateDestination.mock.calls[1][2];
    expect(secondOpts.bundlePath).not.toBe(firstOpts.bundlePath);
  });

  it('keys by resolved config content, so a cloud id whose content changes rebuilds', async () => {
    const tool = server.getTool('flow_simulate');

    getFlow.mockResolvedValueOnce({ config: { version: 4, flows: { a: {} } } });
    await tool.handler({
      configPath: 'flow_abc',
      event: '{"name":"page view"}',
      step: 'destination.gtag',
    });

    // Same id, different resolved content -> must rebuild.
    getFlow.mockResolvedValueOnce({ config: { version: 4, flows: { b: {} } } });
    await tool.handler({
      configPath: 'flow_abc',
      event: '{"name":"page view"}',
      step: 'destination.gtag',
    });

    expect(bundleMock).toHaveBeenCalledTimes(2);
  });
});
