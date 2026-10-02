import { createLocalRuntime } from '../../runtime/local.js';
import { createFlowSimulateToolSpec } from '../../tools/simulate.js';

jest.mock('@walkeros/cli/dev', () => jest.requireActual('@walkeros/cli/dev'));

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
  bundle: (
    config: unknown,
    options: { buildOverrides?: { output?: string } },
  ) => bundleMock(config, options),
  simulateSource: jest.fn(),
  simulateTransformer: jest.fn(),
  simulateDestination: jest.fn(),
  loadConfig: jest.fn(async (input: string) =>
    input.startsWith('{') ? input : '{"version":4,"flows":{}}',
  ),
  collectKnownSecrets: jest.fn(() => []),
}));

jest.mock('@walkeros/core', () => ({
  // The real narrowing helper: cloud-id resolution reads the flow record through it.
  isObject: jest.requireActual('@walkeros/core').isObject,
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
} from '../../runtime/bundle-cache.js';

const mockSimulateDestination = jest.mocked(simulateDestination);

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
  let spec: ReturnType<typeof createFlowSimulateToolSpec>;
  let getFlow: jest.Mock;

  beforeEach(async () => {
    getFlow = jest.fn();
    spec = createFlowSimulateToolSpec(
      stubClient({ getFlow }),
      createLocalRuntime(),
    );
    jest.clearAllMocks();
    await __resetBundleCacheForTests();
    mockSimulateDestination.mockResolvedValue(destResult());
  });

  afterEach(async () => {
    await __resetBundleCacheForTests();
  });

  it('bundles once for two simulate calls with the same config, reuses bundlePath', async () => {
    const config = '{"version":4,"flows":{"default":{}}}';

    await spec.handler({
      configPath: config,
      event: '{"name":"page view"}',
      step: 'destination.gtag',
    });
    await spec.handler({
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
    await spec.handler({
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
    await spec.handler({
      configPath: '{"version":4,"flows":{"default":{}}}',
      event: '{"name":"page view"}',
      step: 'destination.gtag',
    });
    await spec.handler({
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
    getFlow.mockResolvedValueOnce({ config: { version: 4, flows: { a: {} } } });
    await spec.handler({
      configPath: 'flow_abc',
      event: '{"name":"page view"}',
      step: 'destination.gtag',
    });

    // Same id, different resolved content -> must rebuild.
    getFlow.mockResolvedValueOnce({ config: { version: 4, flows: { b: {} } } });
    await spec.handler({
      configPath: 'flow_abc',
      event: '{"name":"page view"}',
      step: 'destination.gtag',
    });

    expect(bundleMock).toHaveBeenCalledTimes(2);
  });
});
