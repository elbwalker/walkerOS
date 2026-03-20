import { simulateSourceCLI } from '../source-simulator.js';

// Mock @walkeros/collector's simulate
jest.mock('@walkeros/collector', () => ({
  simulate: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const mockSimulate = require('@walkeros/collector').simulate as jest.Mock;

describe('simulateSourceCLI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns error when source step not found', async () => {
    const result = await simulateSourceCLI(
      { sources: { mySource: { package: '@walkeros/web-source-datalayer' } } },
      { content: {} },
      { sourceStep: 'nonexistent' },
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
    expect(result.error).toContain('mySource');
  });

  it('returns error when source has no package field', async () => {
    const result = await simulateSourceCLI(
      { sources: { mySource: { config: {} } } },
      { content: {} },
      { sourceStep: 'mySource' },
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('no package field');
  });

  it('returns error when flow has no sources', async () => {
    const result = await simulateSourceCLI(
      { destinations: {} },
      { content: {} },
      { sourceStep: 'test' },
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('no sources');
  });
});
