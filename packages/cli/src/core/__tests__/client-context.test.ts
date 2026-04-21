import {
  setClientContext,
  getClientContext,
  clientContextHeaders,
  resetClientContext,
} from '../client-context.js';

describe('core/client-context', () => {
  const origEnv = process.env.WALKEROS_CLIENT_TYPE;

  beforeEach(() => {
    resetClientContext();
    delete process.env.WALKEROS_CLIENT_TYPE;
  });

  afterAll(() => {
    if (origEnv !== undefined) {
      process.env.WALKEROS_CLIENT_TYPE = origEnv;
    } else {
      delete process.env.WALKEROS_CLIENT_TYPE;
    }
  });

  it('returns undefined when unset', () => {
    expect(getClientContext()).toBeUndefined();
    expect(clientContextHeaders()).toEqual({});
  });

  it('stores and retrieves context', () => {
    setClientContext({ type: 'cli', version: '3.3.1' });
    expect(getClientContext()).toEqual({ type: 'cli', version: '3.3.1' });
  });

  it('produces User-Agent + X-WalkerOS-* headers', () => {
    setClientContext({ type: 'mcp', version: '3.3.1' });
    expect(clientContextHeaders()).toEqual({
      'User-Agent': 'walkeros-mcp/3.3.1',
      'X-WalkerOS-Client': 'mcp',
      'X-WalkerOS-Client-Version': '3.3.1',
    });
  });

  it('WALKEROS_CLIENT_TYPE env var wins over input.type', () => {
    process.env.WALKEROS_CLIENT_TYPE = 'runner';
    setClientContext({ type: 'cli', version: '3.3.1' });
    expect(getClientContext()?.type).toBe('runner');
    expect(clientContextHeaders()['X-WalkerOS-Client']).toBe('runner');
  });

  it('defaults to cli when no type and no env', () => {
    setClientContext({ version: '3.3.1' });
    expect(getClientContext()?.type).toBe('cli');
  });

  it('resetClientContext clears the stored value', () => {
    setClientContext({ type: 'mcp', version: '3.3.1' });
    resetClientContext();
    expect(getClientContext()).toBeUndefined();
    expect(clientContextHeaders()).toEqual({});
  });
});
