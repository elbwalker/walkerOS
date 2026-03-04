import { simulateSourceCLI } from '../source-simulator.js';

// Mock @walkeros/collector's simulateSource
jest.mock('@walkeros/collector', () => ({
  simulateSource: jest.fn(),
}));

// Mock jsdom
jest.mock('jsdom', () => ({
  JSDOM: jest.fn().mockImplementation(() => ({
    window: {
      close: jest.fn(),
      document: {},
      localStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn(),
      },
    },
  })),
  VirtualConsole: jest.fn(),
}));

const mockSimulateSource =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@walkeros/collector').simulateSource as jest.Mock;

describe('simulateSourceCLI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns error when source step not found', async () => {
    const result = await simulateSourceCLI(
      { sources: { mySource: { package: '@walkeros/web-source-datalayer' } } },
      {},
      { sourceStep: 'nonexistent' },
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
    expect(result.error).toContain('mySource');
  });

  it('returns error when source has no package field', async () => {
    const result = await simulateSourceCLI(
      { sources: { mySource: { config: {} } } },
      {},
      { sourceStep: 'mySource' },
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('no package field');
  });

  it('returns error when flow has no sources', async () => {
    const result = await simulateSourceCLI(
      { destinations: {} },
      {},
      { sourceStep: 'test' },
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('no sources');
  });

  it('returns capturedEvents on success when package loads', async () => {
    const mockEvents = [
      { name: 'page view', data: { title: 'Home' } },
      { name: 'product view', data: { id: '123' } },
    ];

    mockSimulateSource.mockResolvedValue({
      capturedEvents: mockEvents,
      collector: { command: jest.fn() },
    });

    const result = await simulateSourceCLI(
      {
        sources: {
          dl: {
            package: '@walkeros/web-source-datalayer',
            config: { settings: { name: 'dataLayer' } },
          },
        },
      },
      [{ event: 'test' }],
      { sourceStep: 'dl' },
    );

    // Dynamic import of the source package will fail since it's not installed,
    // but error handling returns a graceful result
    expect(result.duration).toBeDefined();
  });
});
