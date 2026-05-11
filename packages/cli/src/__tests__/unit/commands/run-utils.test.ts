/**
 * Unit test: run command utilities
 *
 * Confirms `walkeros run flow.json` routes through the unified `bundle()`
 * API (Decision #1: trace-on-run uses the same bundler path as
 * `walkeros bundle`) and writes the temp artifact as `flow.mjs`.
 */

import path from 'path';

jest.mock('../../../commands/bundle/index.js', () => ({
  bundle: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('fs-extra', () => ({
  __esModule: true,
  default: {
    ensureDir: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../core/index.js', () => ({
  getTmpPath: jest.fn(
    (_dir: string | undefined, name: string) => `/tmp/${name}`,
  ),
}));

import { prepareBundleForRun } from '../../../commands/run/utils.js';
import { bundle } from '../../../commands/bundle/index.js';

const mockedBundle = jest.mocked(bundle);

describe('prepareBundleForRun', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the unified bundle() API with flow.mjs as the temp output', async () => {
    const result = await prepareBundleForRun('/path/to/flow.json', {
      verbose: false,
      silent: true,
    });

    expect(mockedBundle).toHaveBeenCalledTimes(1);

    const [configArg, optionsArg] = mockedBundle.mock.calls[0];
    expect(configArg).toBe('/path/to/flow.json');
    expect(optionsArg).toBeDefined();

    const buildOverrides = optionsArg!.buildOverrides;
    expect(buildOverrides).toBeDefined();
    expect(buildOverrides!.output).toBeDefined();
    expect(path.basename(buildOverrides!.output as string)).toBe('flow.mjs');
    expect(buildOverrides!.format).toBe('esm');
    expect(buildOverrides!.platform).toBe('node');

    expect(path.basename(result.bundlePath)).toBe('flow.mjs');
    expect(typeof result.cleanup).toBe('function');
  });

  it('forwards flowName to the bundle() API', async () => {
    await prepareBundleForRun('/path/to/multi.json', {
      verbose: false,
      silent: true,
      flowName: 'serverFlow',
    });

    const [, optionsArg] = mockedBundle.mock.calls[0];
    expect(optionsArg!.flowName).toBe('serverFlow');
  });
});
