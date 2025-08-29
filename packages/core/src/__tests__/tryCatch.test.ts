import { tryCatch, tryCatchAsync } from '..';

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

  test('tryCatch with finally', () => {
    const onFinally = jest.fn();
    const onError = jest.fn();

    // Test finally with successful execution
    tryCatch(() => 'success', undefined, onFinally)();
    expect(onFinally).toHaveBeenCalledTimes(1);

    // Test finally with error
    tryCatch(
      () => {
        throw new Error('foo');
      },
      onError,
      onFinally,
    )();
    expect(onFinally).toHaveBeenCalledTimes(2);
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

  test('tryCatchAsync with finally', async () => {
    const onFinally = jest.fn();
    const onError = jest.fn();
    // Test finally with successful execution
    await tryCatchAsync(async () => 'success', undefined, onFinally)();
    expect(onFinally).toHaveBeenCalledTimes(1);

    // Test finally with error
    await tryCatchAsync(
      async () => {
        throw new Error('foo');
      },
      onError,
      onFinally,
    )();
    expect(onFinally).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));

    // Test finally with async cleanup
    const asyncOnFinally = jest.fn().mockResolvedValue(undefined);
    await tryCatchAsync(async () => 'success', undefined, asyncOnFinally)();
    expect(asyncOnFinally).toHaveBeenCalledTimes(1);
  });
});
