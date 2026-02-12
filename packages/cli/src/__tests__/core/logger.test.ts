import { createLogger } from '../../core/logger.js';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should log messages when not silent', () => {
    const logger = createLogger({ silent: false });

    logger.info('test message');
    logger.success('success message');
    logger.warning('warning message');

    expect(consoleLogSpy).toHaveBeenCalledTimes(3);
  });

  it('should not log messages when silent', () => {
    const logger = createLogger({ silent: true });

    logger.info('test message');
    logger.success('success message');
    logger.warning('warning message');

    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should log debug messages only when verbose', () => {
    const logger = createLogger({ verbose: true, silent: false });

    logger.debug('debug message');

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('debug message'),
    );
  });

  it('should not log debug messages when not verbose', () => {
    const logger = createLogger({ verbose: false, silent: false });

    logger.debug('debug message');

    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should always log errors unless in JSON mode', () => {
    const logger = createLogger({ silent: true, json: false });

    logger.error('error message');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('error message'),
    );
  });

  it('should not log errors in JSON mode', () => {
    const logger = createLogger({ json: true });

    logger.error('error message');

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should handle custom colors', () => {
    const logger = createLogger({ silent: false });

    logger.log('blue', 'blue message');
    logger.log('red', 'red message');

    expect(consoleLogSpy).toHaveBeenCalledTimes(2);
  });

  describe('stderr mode', () => {
    it('should send all log output to stderr when stderr mode is enabled', () => {
      const logger = createLogger({ stderr: true });

      logger.log('message');
      logger.info('info');
      logger.success('success');
      logger.warning('warning');
      logger.brand('brand');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(5);
    });

    it('should send json output to stderr when stderr mode is enabled', () => {
      const logger = createLogger({ stderr: true });

      logger.json({ test: true });

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should send debug output to stderr when stderr mode is enabled', () => {
      const logger = createLogger({ verbose: true, stderr: true });

      logger.debug('debug msg');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should still send error output to stderr regardless of stderr mode', () => {
      const logger = createLogger({ stderr: true });

      logger.error('error msg');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should send gray and warn to stderr when stderr mode is enabled', () => {
      const logger = createLogger({ stderr: true });

      logger.gray('gray msg');
      logger.warn('warn msg');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    });
  });
});
