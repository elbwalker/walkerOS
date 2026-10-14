import { createLocalRuntime } from '../../runtime/local.js';
import { createFlowBundleToolSpec } from '../../tools/bundle.js';
import { BundleOutputShape } from '../../schemas/output.js';

jest.mock('@walkeros/cli/dev', () => jest.requireActual('@walkeros/cli/dev'));

jest.mock('@walkeros/cli', () => ({
  bundle: jest.fn(),
}));

jest.mock('@walkeros/core', () => ({
  // The real narrowing helper: the local runtime reads through it.
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

import { bundle } from '@walkeros/cli';
import {
  structured,
  isErrorResult,
  textOf,
  record,
} from '../support/tool-result.js';
const mockBundle = jest.mocked(bundle);

describe('flow_bundle tool', () => {
  let spec: ReturnType<typeof createFlowBundleToolSpec>;

  beforeEach(() => {
    spec = createFlowBundleToolSpec(createLocalRuntime());
  });

  it('registers with correct name, title, and annotations', () => {
    expect(spec.name).toBe('flow_bundle');
    expect(spec.title).toBe('Bundle Flow');
    expect(spec.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  it('has outputSchema defined', () => {
    expect(createFlowBundleToolSpec(createLocalRuntime()).outputSchema).toBe(
      BundleOutputShape,
    );
  });

  it('calls CLI bundle with correct options', async () => {
    const mockResult = {
      totalSize: 1024,
      buildTime: 150,
      packages: [],
      treeshakingEffective: false,
    };
    mockBundle.mockResolvedValue(mockResult);

    const result = await spec.handler({
      configPath: './flow.json',
      flow: 'myFlow',
      stats: true,
      output: './dist',
    });

    expect(mockBundle).toHaveBeenCalledWith('./flow.json', {
      flowName: 'myFlow',
      stats: true,
      buildOverrides: { output: './dist' },
    });
    expect(structured(result).success).toBe(true);
    expect(structured(result).totalSize).toBe(mockResult.totalSize);
    expect(structured(result).buildTime).toBe(mockResult.buildTime);
  });

  it('defaults stats to true when not provided', async () => {
    mockBundle.mockResolvedValue({
      totalSize: 512,
      buildTime: 0,
      packages: [],
      treeshakingEffective: false,
    });

    await spec.handler({
      configPath: './flow.json',
      flow: undefined,
      stats: undefined,
      output: undefined,
    });

    expect(mockBundle).toHaveBeenCalledWith('./flow.json', {
      flowName: undefined,
      stats: true,
      buildOverrides: undefined,
    });
  });

  it('returns warning when bundle returns null', async () => {
    mockBundle.mockResolvedValue(undefined);

    const result = await spec.handler({
      configPath: './flow.json',
      flow: undefined,
      stats: undefined,
      output: undefined,
    });

    expect(structured(result).success).toBe(false);
  });

  it('returns isError on CLI failure', async () => {
    mockBundle.mockRejectedValue(new Error('Build failed'));

    const result = await spec.handler({
      configPath: './flow.json',
      flow: undefined,
      stats: undefined,
      output: undefined,
    });

    expect(isErrorResult(result)).toBe(true);
    const parsed: unknown = JSON.parse(textOf(result));
    expect(record(parsed).error).toBe('Build failed');
  });

  it('passes a local file path through unchanged', async () => {
    mockBundle.mockResolvedValue({
      totalSize: 256,
      buildTime: 10,
      packages: [],
      treeshakingEffective: false,
    });

    await spec.handler({
      configPath: './flow.json',
      flow: undefined,
      stats: undefined,
      output: undefined,
    });

    expect(mockBundle).toHaveBeenCalledWith('./flow.json', expect.anything());
  });
});
