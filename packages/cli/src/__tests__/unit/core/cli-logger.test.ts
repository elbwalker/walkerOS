import { createCLILogger } from '../../../core/cli-logger.js';

describe('createCLILogger', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows info and error by default', () => {
    const log = createCLILogger();
    log.info('hello');
    log.error('bad');
    expect(console.log).toHaveBeenCalledWith('hello');
    expect(console.error).toHaveBeenCalled();
  });

  it('suppresses debug without verbose', () => {
    const log = createCLILogger();
    log.debug('hidden');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('shows debug with verbose', () => {
    const log = createCLILogger({ verbose: true });
    log.debug('visible');
    expect(console.log).toHaveBeenCalledWith('  visible');
  });

  it('suppresses non-errors in silent mode', () => {
    const log = createCLILogger({ silent: true });
    log.info('hidden');
    log.warn('hidden');
    log.debug('hidden');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('shows errors in silent mode', () => {
    const log = createCLILogger({ silent: true });
    log.error('visible');
    expect(console.error).toHaveBeenCalled();
  });

  it('suppresses non-errors in json mode', () => {
    const log = createCLILogger({ json: true });
    log.info('hidden');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('suppresses errors in json mode', () => {
    const log = createCLILogger({ json: true });
    log.error('hidden');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('outputs json data', () => {
    const log = createCLILogger();
    log.json({ key: 'value' });
    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify({ key: 'value' }, null, 2),
    );
  });

  it('routes to stderr when stderr option set', () => {
    const log = createCLILogger({ stderr: true });
    log.info('to stderr');
    expect(console.error).toHaveBeenCalledWith('to stderr');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('supports scoping', () => {
    const log = createCLILogger();
    const scoped = log.scope('test');
    scoped.info('scoped msg');
    expect(console.log).toHaveBeenCalledWith('[test] scoped msg');
  });

  it('supports throw', () => {
    const log = createCLILogger();
    expect(() => log.throw('fatal')).toThrow('fatal');
  });
});
