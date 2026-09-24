import { Level } from '../types/logger';
import { createCLILogger, getTmpPath } from '../node';

describe('createCLILogger', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('prints plain ERROR lines when no colours are injected', () => {
    createCLILogger().error('boom');
    expect(errorSpy).toHaveBeenCalledWith('boom');
  });

  it('formats console output with the injected colour, never the ring line', () => {
    const lines: Array<[Level, string]> = [];
    createCLILogger(
      { onLine: (level, message) => lines.push([level, message]) },
      { error: (line) => `<red>${line}</red>` },
    ).error('boom');

    expect(errorSpy).toHaveBeenCalledWith('<red>boom</red>');
    expect(lines).toEqual([[Level.ERROR, 'boom']]);
  });

  it('scrubs secrets before both the ring tap and the console', () => {
    const lines: string[] = [];
    createCLILogger({ onLine: (_level, message) => lines.push(message) }).error(
      'token sk-abcdefghijklmnopqrstuvwxyz123456',
    );

    expect(lines[0]).not.toContain('sk-abcdefghijklmnopqrstuvwxyz123456');
    expect(errorSpy.mock.calls[0][0]).toBe(lines[0]);
  });
});

describe('getTmpPath', () => {
  it('joins segments under an absolute custom root', () => {
    expect(getTmpPath('/custom', 'cache', 'builds')).toBe(
      '/custom/cache/builds',
    );
  });
});
