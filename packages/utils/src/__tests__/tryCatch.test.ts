import { tryCatch, tryCatchAsync } from '../core';

describe('tryCatch', () => {
  test('tryCatch', () => {
    const result =
      tryCatch(() => {
        throw new Error('foo');
      })() || 'backup';
    expect(result).toBe('backup');

    // Custom error handler
    const onError = jest.fn();
    tryCatch(() => {
      throw new Error('foo');
    }, onError)();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  test('tryCatchAsync', async () => {
    const result =
      (await tryCatchAsync(async () => {
        throw new Error('foo');
      })()) || 'backup';
    expect(result).toBe('backup');

    // Custom error handler
    const onError = jest.fn();
    await tryCatchAsync(async () => {
      throw new Error('foo');
    }, onError)();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
