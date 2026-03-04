import { createLogger, Level } from '../logger';

describe('logger', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Level enum', () => {
    it('has correct numeric values', () => {
      expect(Level.ERROR).toBe(0);
      expect(Level.WARN).toBe(1);
      expect(Level.INFO).toBe(2);
      expect(Level.DEBUG).toBe(3);
    });
  });

  describe('warn method', () => {
    it('outputs via console.warn when level is WARN', () => {
      const logger = createLogger({ level: Level.WARN });
      logger.warn('something is off');
      expect(console.warn).toHaveBeenCalledWith('WARN', 'something is off');
    });

    it('is suppressed at ERROR level', () => {
      const logger = createLogger({ level: Level.ERROR });
      logger.warn('should not appear');
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('is visible at INFO level', () => {
      const logger = createLogger({ level: Level.INFO });
      logger.warn('visible');
      expect(console.warn).toHaveBeenCalledWith('WARN', 'visible');
    });

    it('is visible at DEBUG level', () => {
      const logger = createLogger({ level: Level.DEBUG });
      logger.warn('also visible');
      expect(console.warn).toHaveBeenCalledWith('WARN', 'also visible');
    });

    it('includes scope in prefix', () => {
      const logger = createLogger({ level: Level.WARN });
      const scoped = logger.scope('myDest');
      scoped.warn('scoped warning');
      expect(console.warn).toHaveBeenCalledWith(
        'WARN [myDest]',
        'scoped warning',
      );
    });

    it('includes context when provided', () => {
      const logger = createLogger({ level: Level.WARN });
      logger.warn('degraded', { retries: 3 });
      expect(console.warn).toHaveBeenCalledWith('WARN', 'degraded', {
        retries: 3,
      });
    });
  });

  describe('level filtering with WARN', () => {
    it('WARN level shows error and warn but not info or debug', () => {
      const logger = createLogger({ level: Level.WARN });

      logger.error('err');
      logger.warn('wrn');
      logger.info('inf');
      logger.debug('dbg');

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('string level config', () => {
    it('accepts WARN as string', () => {
      const logger = createLogger({ level: 'WARN' });
      logger.warn('from string config');
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('json method', () => {
    it('outputs JSON.stringify to console.log by default', () => {
      const logger = createLogger();
      logger.json({ key: 'value' });
      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify({ key: 'value' }, null, 2),
      );
    });

    it('uses custom jsonHandler when provided', () => {
      const jsonHandler = jest.fn();
      const logger = createLogger({ jsonHandler });
      logger.json({ key: 'value' });
      expect(jsonHandler).toHaveBeenCalledWith({ key: 'value' });
      expect(console.log).not.toHaveBeenCalled();
    });

    it('works on scoped loggers', () => {
      const jsonHandler = jest.fn();
      const logger = createLogger({ jsonHandler });
      const scoped = logger.scope('test');
      scoped.json({ scoped: true });
      expect(jsonHandler).toHaveBeenCalledWith({ scoped: true });
    });
  });
});
