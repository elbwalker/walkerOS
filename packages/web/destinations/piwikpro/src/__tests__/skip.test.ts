import { createMockLogger } from '@walkeros/core';
import { logSkip, SKIP_KEY_CAP } from '../skip';

describe('logSkip', () => {
  test('warns once per key, then logs at debug', () => {
    const logger = createMockLogger();

    logSkip(logger, 'dest|foo bar|unmapped', 'skipped', { reason: 'unmapped' });
    logSkip(logger, 'dest|foo bar|unmapped', 'skipped', { reason: 'unmapped' });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith('skipped', { reason: 'unmapped' });
    expect(logger.debug).toHaveBeenCalledTimes(1);
  });

  test('beyond the cap every new key logs at debug', () => {
    const logger = createMockLogger();
    for (let i = 0; i < SKIP_KEY_CAP; i++)
      logSkip(logger, `dest|event ${i}|unmapped`, 'skipped', {});
    logger.warn.mockClear();
    logger.debug.mockClear();

    logSkip(logger, 'dest|one more|unmapped', 'skipped', {});

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledTimes(1);
  });
});
