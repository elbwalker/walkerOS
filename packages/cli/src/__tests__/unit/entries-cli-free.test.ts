/**
 * The CLI-free entries load in a server process: the app registers the shared
 * MCP tool specs through them. A throwing module factory stands in for the
 * bundler and the package manager, so an entry that reaches either, at import
 * or during a run, fails here.
 */
jest.mock('esbuild', () => {
  throw new Error('esbuild was loaded');
});
jest.mock('pacote', () => {
  throw new Error('pacote was loaded');
});

const FLOW = {
  version: 4,
  flows: {
    default: {
      config: { platform: 'web' },
      sources: {},
      destinations: {},
    },
  },
};

describe('CLI-free entries', () => {
  it('@walkeros/cli/validate validates a flow without esbuild or pacote', async () => {
    const entry = await import('../../validate.js');
    const result = await entry.validate('flow', FLOW, { offline: true });
    expect(result.errors).toEqual([]);
    expect(entry.VALIDATE_CODES.length).toBeGreaterThan(0);
  });

  it('@walkeros/cli/dev carries the example helpers without esbuild or pacote', async () => {
    const entry = await import('../../dev.js');
    expect(typeof entry.resolveExportName).toBe('function');
    expect(typeof entry.selectDevExamples).toBe('function');
  });

  it('the guard is live: the bundler trips it', async () => {
    await expect(import('../../commands/bundle/bundler.js')).rejects.toThrow(
      'esbuild was loaded',
    );
  });
});
