import { createLocalRuntime } from '../../runtime/local.js';
import { createFlowLoadToolSpec } from '../../tools/flow-load.js';
import { stubClient } from '../support/stub-client.js';
import { structured, record, textOf } from '../support/tool-result.js';

jest.mock('@walkeros/cli', () => ({
  loadJsonConfig: jest.fn(),
}));

jest.mock('@walkeros/core', () => ({
  // The real narrowing helper: cloud-id resolution reads the flow record through it.
  isObject: jest.requireActual('@walkeros/core').isObject,
  mcpResult: jest.fn((result, hints) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          hints ? { ...result, _hints: hints } : result,
          null,
          2,
        ),
      },
    ],
    structuredContent: hints ? { ...result, _hints: hints } : result,
  })),
  mcpError: jest.fn((error) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
    ],
    isError: true,
  })),
}));

import { loadJsonConfig } from '@walkeros/cli';
// Pull the real v4 schema via the `/dev` entry — separate from the mocked
// `@walkeros/core` main entry, so the schema bypasses the mock above.
import { schemas } from '@walkeros/core/dev';
const FlowJsonSchema = schemas.FlowJsonSchema;
const mockLoadJsonConfig = jest.mocked(loadJsonConfig);

/** The value at a nested object path, narrowed level by level. */
function at(value: unknown, ...path: string[]): unknown {
  return path.reduce<unknown>((node, key) => record(node)[key], value);
}

describe('flow_load tool', () => {
  let spec: ReturnType<typeof createFlowLoadToolSpec>;

  beforeEach(() => {
    jest.clearAllMocks();
    spec = createFlowLoadToolSpec(stubClient(), createLocalRuntime());
  });

  it('registers with correct name and annotations', () => {
    expect(spec.name).toBe('flow_load');
    expect(spec.title).toBe('Load or Create Flow');
    expect(spec.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    });
  });

  it('loads from local path', async () => {
    const mockConfig = { version: 1, flows: { default: { web: {} } } };
    mockLoadJsonConfig.mockResolvedValue(mockConfig);

    const result = await spec.handler({ source: './flow.json' });

    expect(mockLoadJsonConfig).toHaveBeenCalledWith('./flow.json');
    expect(structured(result)).toMatchObject(mockConfig);
    expect(structured(result)._hints).toBeDefined();
    expect(record(result).isError).toBeUndefined();
  });

  it('creates new web flow skeleton', async () => {
    const result = await spec.handler({ platform: 'web' });

    expect(mockLoadJsonConfig).not.toHaveBeenCalled();
    expect(structured(result).version).toBe(4);
    expect(at(structured(result), 'flows', 'default', 'config')).toEqual({
      platform: 'web',
      bundle: { packages: {} },
    });
    expect(record(result).isError).toBeUndefined();
  });

  it('creates new server flow skeleton', async () => {
    const result = await spec.handler({ platform: 'server' });

    expect(structured(result).version).toBe(4);
    expect(at(structured(result), 'flows', 'default', 'config')).toEqual({
      platform: 'server',
      bundle: { packages: {} },
    });
  });

  it('errors when neither source nor platform provided', async () => {
    const result = await spec.handler({});

    expect(record(result).isError).toBe(true);
    const parsed = record(JSON.parse(textOf(result)));
    expect(parsed.error).toContain('source');
  });

  it('errors when source file does not exist', async () => {
    mockLoadJsonConfig.mockRejectedValue(new Error('File not found'));

    const result = await spec.handler({ source: './missing.json' });

    expect(record(result).isError).toBe(true);
  });

  it('source takes priority over platform', async () => {
    const mockConfig = { version: 1, flows: {} };
    mockLoadJsonConfig.mockResolvedValue(mockConfig);

    const result = await spec.handler({
      source: './flow.json',
      platform: 'web',
    });

    expect(mockLoadJsonConfig).toHaveBeenCalledWith('./flow.json');
    expect(structured(result)).toMatchObject(mockConfig);
  });

  it('redacts loaded config identically to flow_manage get (structural keys literal, values wrapped)', async () => {
    const loaded = {
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' },
          destinations: {
            demo: {
              package: '@walkeros/destination-demo',
              config: { settings: { apiKey: 'secret' } },
            },
          },
        },
      },
    };
    mockLoadJsonConfig.mockResolvedValue(loaded);

    const result = await spec.handler({ source: './flow.json' });
    const out = structured(result);

    // Structural keys literal — same rule as flow_manage get.
    expect(out.version).toBe(4);
    expect(at(out, 'flows', 'default', 'config', 'platform')).toBe('web');
    expect(at(out, 'flows', 'default', 'destinations', 'demo', 'package')).toBe(
      '@walkeros/destination-demo',
    );
    // User VALUES wrapped.
    expect(
      at(
        out,
        'flows',
        'default',
        'destinations',
        'demo',
        'config',
        'settings',
        'apiKey',
      ),
    ).toBe('<user_data>secret</user_data>');
  });

  it('flow_load skeleton round-trips through v4 schema', async () => {
    const webResult = await spec.handler({ platform: 'web' });
    const webSkeleton: unknown = JSON.parse(textOf(webResult));
    const webParse = FlowJsonSchema.safeParse(webSkeleton);
    if (!webParse.success) {
      // eslint-disable-next-line no-console
      console.error(JSON.stringify(webParse.error.issues, null, 2));
    }
    expect(webParse.success).toBe(true);

    const serverResult = await spec.handler({ platform: 'server' });
    const serverSkeleton: unknown = JSON.parse(textOf(serverResult));
    const serverParse = FlowJsonSchema.safeParse(serverSkeleton);
    if (!serverParse.success) {
      // eslint-disable-next-line no-console
      console.error(JSON.stringify(serverParse.error.issues, null, 2));
    }
    expect(serverParse.success).toBe(true);
  });

  describe('load by flow/cfg ID via ToolClient', () => {
    it('routes a cfg_ source through client.getFlow, not loadJsonConfig', async () => {
      const getFlow = jest.fn().mockResolvedValue({
        id: 'cfg_abc',
        name: 'My Flow',
        config: { version: 4, flows: {} },
      });
      spec = createFlowLoadToolSpec(
        stubClient({ getFlow, getDefaultProject: () => 'proj_default' }),
        createLocalRuntime(),
      );

      const result = await spec.handler({ source: 'cfg_abc' });

      expect(getFlow).toHaveBeenCalledTimes(1);
      expect(getFlow).toHaveBeenCalledWith({
        flowId: 'cfg_abc',
        projectId: 'proj_default',
      });
      expect(mockLoadJsonConfig).not.toHaveBeenCalled();
      expect(record(result).isError).toBeUndefined();
      expect(structured(result)).toMatchObject({
        version: 4,
        flows: {},
      });
    });

    it('routes a flow_ source through client.getFlow, not loadJsonConfig', async () => {
      const getFlow = jest.fn().mockResolvedValue({
        id: 'flow_xyz',
        config: { version: 4, flows: {} },
      });
      spec = createFlowLoadToolSpec(
        stubClient({ getFlow, getDefaultProject: () => 'proj_default' }),
        createLocalRuntime(),
      );

      const result = await spec.handler({ source: 'flow_xyz' });

      expect(getFlow).toHaveBeenCalledTimes(1);
      expect(getFlow).toHaveBeenCalledWith({
        flowId: 'flow_xyz',
        projectId: 'proj_default',
      });
      expect(mockLoadJsonConfig).not.toHaveBeenCalled();
      expect(record(result).isError).toBeUndefined();
    });

    it.each([
      ['./flow.json', './flow.json'],
      ['https://example.com/flow.json', 'https://example.com/flow.json'],
      ['{"version":4,"flows":{}}', '{"version":4,"flows":{}}'],
    ])('routes non-ID source %s to loadJsonConfig', async (source) => {
      const getFlow = jest.fn();
      mockLoadJsonConfig.mockResolvedValue({ version: 4, flows: {} });
      spec = createFlowLoadToolSpec(
        stubClient({ getFlow }),
        createLocalRuntime(),
      );

      await spec.handler({ source });

      expect(mockLoadJsonConfig).toHaveBeenCalledWith(source);
      expect(getFlow).not.toHaveBeenCalled();
    });

    it('errors with NO_DEFAULT_PROJECT message when no default project and an ID source', async () => {
      const getFlow = jest.fn();
      spec = createFlowLoadToolSpec(
        stubClient({ getFlow, getDefaultProject: () => null }),
        createLocalRuntime(),
      );

      const result = await spec.handler({ source: 'cfg_abc' });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.error).toContain('No project selected');
      expect(parsed.error).not.toContain('Flow not found');
      expect(getFlow).not.toHaveBeenCalled();
    });

    it('surfaces a NOT_FOUND-style error for a non-existent ID, not a file-not-found message', async () => {
      const getFlow = jest
        .fn()
        .mockRejectedValue(new Error('Flow not found: cfg_missing'));
      spec = createFlowLoadToolSpec(
        stubClient({ getFlow, getDefaultProject: () => 'proj_default' }),
        createLocalRuntime(),
      );

      const result = await spec.handler({ source: 'cfg_missing' });

      expect(record(result).isError).toBe(true);
      const parsed = record(JSON.parse(textOf(result)));
      expect(parsed.error).toContain('Flow not found');
      expect(parsed.error).not.toContain('Configuration file not found');
      expect(parsed.hint ?? '').not.toContain('configPath');
    });

    it('redacts the ID-loaded config: structural keys literal, values wrapped', async () => {
      const getFlow = jest.fn().mockResolvedValue({
        id: 'cfg_abc',
        config: {
          version: 4,
          flows: {
            default: {
              config: { platform: 'web' },
              destinations: {
                demo: {
                  package: '@walkeros/destination-demo',
                  config: { settings: { apiKey: 'secret' } },
                },
              },
            },
          },
        },
      });
      spec = createFlowLoadToolSpec(
        stubClient({ getFlow, getDefaultProject: () => 'proj_default' }),
        createLocalRuntime(),
      );

      const result = await spec.handler({ source: 'cfg_abc' });
      const out = structured(result);

      expect(out.version).toBe(4);
      expect(at(out, 'flows', 'default', 'config', 'platform')).toBe('web');
      expect(
        at(out, 'flows', 'default', 'destinations', 'demo', 'package'),
      ).toBe('@walkeros/destination-demo');
      expect(
        at(
          out,
          'flows',
          'default',
          'destinations',
          'demo',
          'config',
          'settings',
          'apiKey',
        ),
      ).toBe('<user_data>secret</user_data>');
    });
  });
});
