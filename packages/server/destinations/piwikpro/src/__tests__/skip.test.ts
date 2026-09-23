import { createMockLogger } from '@walkeros/core';
import { logSkip, SKIP_KEY_CAP } from '../skip';

// Its own file: jest gives each test file a fresh module registry, so filling
// the key set here cannot reach the warn-once assertions in push.test.ts.
describe('logSkip', () => {
  it('logs at debug once the key cap is reached', () => {
    const logger = createMockLogger();
    for (let i = 0; i < SKIP_KEY_CAP; i++)
      logSkip(logger, `cap|${i}`, 'skipped', {});
    logger.warn.mockClear();

    logSkip(logger, 'cap|new', 'skipped', {});
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith('skipped', {});
  });
});
