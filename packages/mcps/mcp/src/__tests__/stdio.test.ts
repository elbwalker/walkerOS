// stdio is the one door that runs on the user's own machine, so it must build
// the server with the LOCAL runtime. The module starts the server on import,
// so everything around the factory call is mocked and only the runtime handed
// to the factory is inspected.
jest.mock('@walkeros/cli', () => ({
  setClientContext: jest.fn(),
  loadJsonConfig: jest.fn(),
  bundle: jest.fn(),
  push: jest.fn(),
  simulateSource: jest.fn(),
  simulateTransformer: jest.fn(),
  simulateCollector: jest.fn(),
  simulateDestination: jest.fn(),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {},
}));

jest.mock('../http-tool-client.js', () => ({ HttpToolClient: class {} }));
jest.mock('../telemetry.js', () => ({ createMcpEmitter: jest.fn() }));
jest.mock('../server.js', () => ({
  createWalkerOSMcpServer: jest.fn(() => ({
    connect: jest.fn(async () => undefined),
  })),
  getMcpEmitterSingleton: jest.fn(),
}));

import { createWalkerOSMcpServer } from '../server.js';

describe('stdio entry point', () => {
  it('builds the server with the local runtime', async () => {
    // `__VERSION__` is a build-time define; the module reads it on import.
    Object.assign(globalThis, { __VERSION__: '0.0.0-test' });
    const onSpy = jest.spyOn(process, 'on').mockImplementation(() => process);
    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      await import('../stdio.js');

      expect(createWalkerOSMcpServer).toHaveBeenCalledTimes(1);
      const opts = jest.mocked(createWalkerOSMcpServer).mock.calls[0][0];
      expect(typeof opts.runtime?.load).toBe('function');
      expect(typeof opts.runtime?.bundle).toBe('function');
      expect(typeof opts.runtime?.simulate).toBe('function');
      expect(typeof opts.runtime?.push).toBe('function');
    } finally {
      onSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
