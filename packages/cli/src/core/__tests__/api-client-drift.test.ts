import { emitDriftWarning, resetDriftWarning } from '../api-client.js';

describe('api-client drift warning (de-duplicated)', () => {
  let warnings: string[];
  let spy: jest.SpyInstance;

  beforeEach(() => {
    resetDriftWarning();
    warnings = [];
    spy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation((chunk: string | Uint8Array): boolean => {
        warnings.push(typeof chunk === 'string' ? chunk : chunk.toString());
        return true;
      });
  });

  afterEach(() => spy.mockRestore());

  function headers(serverVersion?: string, minClient?: string): Headers {
    const h = new Headers();
    if (serverVersion) h.set('X-WalkerOS-Server-Version', serverVersion);
    if (minClient) h.set('X-WalkerOS-Min-Client', minClient);
    return h;
  }

  it('emits one stderr drift warning, not per call', () => {
    emitDriftWarning(headers('2.0.0', '1.5.0'));
    emitDriftWarning(headers('2.0.0', '1.5.0'));
    emitDriftWarning(headers('2.0.0', '1.5.0'));
    const driftLines = warnings.filter((w) => /server.*version/i.test(w));
    expect(driftLines).toHaveLength(1);
  });

  it('does not warn when the version headers are absent', () => {
    emitDriftWarning(headers());
    expect(warnings).toHaveLength(0);
  });

  it('includes the server version in the warning', () => {
    emitDriftWarning(headers('2.0.0', '1.5.0'));
    expect(warnings.join('')).toContain('2.0.0');
  });
});
