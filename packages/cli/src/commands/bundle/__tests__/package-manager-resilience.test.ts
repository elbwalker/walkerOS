import pacote from 'pacote';
import { createMockLogger } from '@walkeros/core';
import {
  extractWithResilience,
  manifestWithResilience,
  PACOTE_RETRY_ATTEMPTS,
} from '../package-manager';

/**
 * Build a fully-typed pacote manifest result so tests never cast. The shape is
 * `AbbreviatedManifest & ManifestResult`; only `name`/`version` are read by
 * callers, the rest satisfy the type.
 */
function makeManifest(
  name: string,
  version: string,
): pacote.AbbreviatedManifest & pacote.ManifestResult {
  return {
    name,
    version,
    deprecated: undefined,
    dist: {
      tarball: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
      shasum: '0'.repeat(40),
    },
    _from: `${name}@${version}`,
    _resolved: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
    _integrity: `sha512-${'0'.repeat(86)}==`,
    _id: `${name}@${version}`,
  };
}

/** Build a typed pacote extract result. */
function makeFetchResult(name: string, version: string): pacote.FetchResult {
  return {
    from: `${name}@${version}`,
    resolved: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
    integrity: `sha512-${'0'.repeat(86)}==`,
  };
}

/** A timeout-shaped abort error, like AbortSignal.timeout/abort surfaces. */
function timeoutError(): Error {
  const err = new Error('The operation was aborted');
  err.name = 'AbortError';
  return err;
}

/** A libuv-style transient network error. */
function networkError(code: string): Error & { code: string } {
  const err = new Error(`network failure: ${code}`);
  return Object.assign(err, { code });
}

/** A permanent npm error carrying a `code` (E404, ETARGET, ...). */
function npmError(code: string): Error & { code: string } {
  const err = new Error(`npm error ${code}`);
  return Object.assign(err, { code });
}

/**
 * Read the `signal` off pacote opts without casting. `signal` is forwarded by
 * pacote at runtime but absent from `@types/pacote`'s Options, so reflect it.
 */
function readSignal(opts: pacote.Options | undefined): AbortSignal | undefined {
  if (!opts) return undefined;
  const signal = Reflect.get(opts, 'signal');
  return signal instanceof AbortSignal ? signal : undefined;
}

/**
 * Small, fast retry options so backoff sleeps and per-attempt timeouts advance
 * quickly under fake timers. Keeps 3 attempts and a budget large enough that the
 * attempts (not the budget) are what bound the loop.
 */
const FAST_RETRY = {
  attempts: PACOTE_RETRY_ATTEMPTS,
  perAttemptTimeoutMs: 50,
  maxTotalMs: 30_000,
};

/**
 * Drive every pending fake timer (per-attempt abort timers + backoff sleeps) to
 * completion, flushing microtasks between callbacks. `runAllTimersAsync`
 * advances through timers scheduled by earlier callbacks too, so the whole
 * bounded retry loop settles in one call. The retry loop is finite (attempts and
 * the wall-clock budget both bound it), so this always terminates.
 */
async function flushRetries(): Promise<void> {
  await jest.runAllTimersAsync();
}

describe('package-manager resilient downloads', () => {
  const logger = createMockLogger();

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('extractWithResilience', () => {
    it('retries a transient timeout then succeeds (2 calls)', async () => {
      const spy = jest
        .spyOn(pacote, 'extract')
        .mockRejectedValueOnce(timeoutError())
        .mockResolvedValueOnce(makeFetchResult('core-js', '3.41.0'));

      const promise = extractWithResilience(
        'core-js@3.41.0',
        '/dest',
        {},
        logger,
        FAST_RETRY,
      );
      await flushRetries();
      await expect(promise).resolves.toBeDefined();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('retries a transient ECONNRESET then succeeds', async () => {
      const spy = jest
        .spyOn(pacote, 'extract')
        .mockRejectedValueOnce(networkError('ECONNRESET'))
        .mockResolvedValueOnce(makeFetchResult('arrow', '21.0.0'));

      const promise = extractWithResilience(
        'arrow@21.0.0',
        '/dest',
        {},
        logger,
        FAST_RETRY,
      );
      await flushRetries();
      await expect(promise).resolves.toBeDefined();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('fails fast on E404 (1 call, no retry)', async () => {
      const spy = jest
        .spyOn(pacote, 'extract')
        .mockRejectedValue(npmError('E404'));

      const promise = extractWithResilience(
        'missing@1.0.0',
        '/dest',
        {},
        logger,
        FAST_RETRY,
      );
      const assertion = expect(promise).rejects.toThrow();
      await flushRetries();
      await assertion;
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('fails fast on E403 (1 call, no retry)', async () => {
      const spy = jest
        .spyOn(pacote, 'extract')
        .mockRejectedValue(npmError('E403'));

      const promise = extractWithResilience(
        'forbidden@1.0.0',
        '/dest',
        {},
        logger,
        FAST_RETRY,
      );
      const assertion = expect(promise).rejects.toThrow();
      await flushRetries();
      await assertion;
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('throws after 3 attempts on persistent timeout (3 calls)', async () => {
      const spy = jest
        .spyOn(pacote, 'extract')
        .mockRejectedValue(timeoutError());

      const promise = extractWithResilience(
        'slow@1.0.0',
        '/dest',
        {},
        logger,
        FAST_RETRY,
      );
      const assertion = expect(promise).rejects.toThrow(/after 3 attempts/);
      await flushRetries();
      await assertion;
      expect(spy).toHaveBeenCalledTimes(PACOTE_RETRY_ATTEMPTS);
    });

    it('resolves immediately on success (1 call, no delay)', async () => {
      const spy = jest
        .spyOn(pacote, 'extract')
        .mockResolvedValue(makeFetchResult('ok', '1.0.0'));

      const promise = extractWithResilience(
        'ok@1.0.0',
        '/dest',
        {},
        logger,
        FAST_RETRY,
      );
      await flushRetries();
      await expect(promise).resolves.toBeDefined();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('passes an AbortSignal in the opts and aborting rejects the attempt', async () => {
      let observed: AbortSignal | undefined;
      const spy = jest
        .spyOn(pacote, 'extract')
        .mockImplementation((_spec, _dest, opts) => {
          const signal = readSignal(opts);
          observed = signal;
          return new Promise<pacote.FetchResult>((_resolve, reject) => {
            if (signal) {
              signal.addEventListener('abort', () => {
                const err = new Error('aborted');
                err.name = 'AbortError';
                reject(err);
              });
            }
          });
        });

      const promise = extractWithResilience(
        'hang@1.0.0',
        '/dest',
        {},
        logger,
        FAST_RETRY,
      );
      const assertion = expect(promise).rejects.toThrow(/after 3 attempts/);
      await flushRetries();
      await assertion;
      expect(observed).toBeInstanceOf(AbortSignal);
      expect(spy).toHaveBeenCalledTimes(PACOTE_RETRY_ATTEMPTS);
    });

    it('stays within the total wall-clock budget on persistent failure', async () => {
      const spy = jest
        .spyOn(pacote, 'extract')
        .mockRejectedValue(timeoutError());

      // A budget too small for 3 full attempts must stop early, never overrun.
      const tightBudget = {
        attempts: PACOTE_RETRY_ATTEMPTS,
        perAttemptTimeoutMs: 50,
        maxTotalMs: 3_000,
      };
      const start = Date.now();
      const promise = extractWithResilience(
        'slow@1.0.0',
        '/dest',
        {},
        logger,
        tightBudget,
      );
      const assertion = expect(promise).rejects.toThrow();
      await flushRetries();
      await assertion;
      // Total elapsed (advanced by fake timers) respects the budget; with the
      // first backoff (~2s) consuming most of a 3s budget, the loop stops before
      // a third attempt rather than overrunning.
      expect(Date.now() - start).toBeLessThanOrEqual(3_000);
      expect(spy.mock.calls.length).toBeLessThanOrEqual(PACOTE_RETRY_ATTEMPTS);
    });
  });

  describe('manifestWithResilience', () => {
    it('retries a transient timeout then succeeds (2 calls)', async () => {
      const spy = jest
        .spyOn(pacote, 'manifest')
        .mockRejectedValueOnce(timeoutError())
        .mockResolvedValueOnce(makeManifest('core-js', '3.41.0'));

      const promise = manifestWithResilience(
        'core-js@^3.41.0',
        {},
        logger,
        FAST_RETRY,
      );
      await flushRetries();
      const result = await promise;
      expect(result.version).toBe('3.41.0');
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('retries a transient ECONNRESET then succeeds', async () => {
      const spy = jest
        .spyOn(pacote, 'manifest')
        .mockRejectedValueOnce(networkError('ECONNRESET'))
        .mockResolvedValueOnce(makeManifest('arrow', '21.0.0'));

      const promise = manifestWithResilience(
        'arrow@^21.0.0',
        {},
        logger,
        FAST_RETRY,
      );
      await flushRetries();
      await expect(promise).resolves.toBeDefined();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('fails fast on E404 (1 call, no retry)', async () => {
      const spy = jest
        .spyOn(pacote, 'manifest')
        .mockRejectedValue(npmError('E404'));

      const promise = manifestWithResilience(
        'missing@1.0.0',
        {},
        logger,
        FAST_RETRY,
      );
      const assertion = expect(promise).rejects.toThrow();
      await flushRetries();
      await assertion;
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('fails fast on E403 (1 call, no retry)', async () => {
      const spy = jest
        .spyOn(pacote, 'manifest')
        .mockRejectedValue(npmError('E403'));

      const promise = manifestWithResilience(
        'forbidden@1.0.0',
        {},
        logger,
        FAST_RETRY,
      );
      const assertion = expect(promise).rejects.toThrow();
      await flushRetries();
      await assertion;
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('throws after 3 attempts on persistent timeout (3 calls)', async () => {
      const spy = jest
        .spyOn(pacote, 'manifest')
        .mockRejectedValue(timeoutError());

      const promise = manifestWithResilience(
        'slow@1.0.0',
        {},
        logger,
        FAST_RETRY,
      );
      const assertion = expect(promise).rejects.toThrow(/after 3 attempts/);
      await flushRetries();
      await assertion;
      expect(spy).toHaveBeenCalledTimes(PACOTE_RETRY_ATTEMPTS);
    });

    it('resolves immediately on success (1 call, no delay)', async () => {
      const spy = jest
        .spyOn(pacote, 'manifest')
        .mockResolvedValue(makeManifest('ok', '1.0.0'));

      const promise = manifestWithResilience(
        'ok@1.0.0',
        {},
        logger,
        FAST_RETRY,
      );
      await flushRetries();
      await expect(promise).resolves.toBeDefined();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('passes an AbortSignal in the opts (3rd arg)', async () => {
      let observed: AbortSignal | undefined;
      const spy = jest
        .spyOn(pacote, 'manifest')
        .mockImplementation((_spec, opts) => {
          observed = readSignal(opts);
          return Promise.resolve(makeManifest('ok', '1.0.0'));
        });

      const promise = manifestWithResilience(
        'ok@1.0.0',
        {},
        logger,
        FAST_RETRY,
      );
      await flushRetries();
      await expect(promise).resolves.toBeDefined();
      expect(observed).toBeInstanceOf(AbortSignal);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
