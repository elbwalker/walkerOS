import {
  ResourceNotFoundException,
  ServiceUnavailableException,
} from '@aws-sdk/client-firehose';
import { createMockContext, createMockLogger } from '@walkeros/core';
import destination from '../';
import { AwsDeliveryError } from '../../lib/errors';
import type { Answer } from './support';
import {
  STREAM,
  accepted,
  batchOf,
  events,
  id,
  initialized,
  recordingEnv,
} from './support';

async function flush(count: number, answer?: Answer) {
  const recording = recordingEnv(answer);
  const logger = createMockLogger();
  const config = await initialized(
    { settings: { streamName: STREAM } },
    recording.env,
  );
  const result = Promise.resolve(
    destination.pushBatch(
      batchOf(events(count)),
      createMockContext({ config, env: recording.env, id, logger }),
    ),
  );
  return { recording, result, config, logger };
}

const busy = (attempts = 3) =>
  new ServiceUnavailableException({
    message: 'busy',
    $metadata: { httpStatusCode: 500, attempts },
  });

describe('Firehose pushBatch outcomes', () => {
  test('resolves void when every record landed', async () => {
    const { result } = await flush(3);
    await expect(result).resolves.toBeUndefined();
  });

  test('returns the failed indices, sorted, on partial failure', async () => {
    const { result } = await flush(600, async (input, call) => {
      if (call === 0) return accepted(input);
      return {
        FailedPutCount: 2,
        RequestResponses: (input.Records ?? []).map((_, i) =>
          i === 7 || i === 2
            ? { ErrorCode: 'InternalFailure', ErrorMessage: 'x' }
            : {},
        ),
      };
    });
    const outcome = await result;
    expect(outcome).toEqual({
      failed: [
        { index: 502, error: expect.any(AwsDeliveryError) },
        { index: 507, error: expect.any(AwsDeliveryError) },
      ],
    });
  });

  test('throws when nothing landed', async () => {
    const { result } = await flush(2, async () => {
      throw busy();
    });
    await expect(result).rejects.toMatchObject({
      code: 'ServiceUnavailableException',
      retryable: true,
    });
  });

  test('mixed causes throw the dominant code, retryable only if all are', async () => {
    const { result } = await flush(1200, async (_input, call) => {
      if (call === 2)
        throw new ResourceNotFoundException({
          message: 'gone',
          $metadata: { httpStatusCode: 400, attempts: 1 },
        });
      throw busy();
    });
    const error = await result.then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(AwsDeliveryError);
    expect(error).toMatchObject({
      code: 'ServiceUnavailableException',
      retryable: false,
    });
    expect(String(error)).toContain('1000 ServiceUnavailableException');
    expect(String(error)).toContain('200 ResourceNotFoundException');
  });

  test('an empty batch makes no call', async () => {
    const { result, recording } = await flush(0);
    await expect(result).resolves.toBeUndefined();
    expect(recording.sends).toEqual([]);
  });

  test('logs no error of its own', async () => {
    const { result, logger } = await flush(2, async () => {
      throw busy();
    });
    await result.catch(() => undefined);
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('destroy waits for a slow pushBatch send', async () => {
    const order: string[] = [];
    const { result, config, recording } = await flush(
      2,
      (input) =>
        new Promise((resolve) =>
          setTimeout(() => {
            order.push('sent');
            resolve(accepted(input));
          }, 20),
        ),
    );
    recording.destroyed[0].mockImplementation(() => order.push('closed'));

    await Promise.resolve();
    await destination.destroy?.({
      id,
      config,
      env: recording.env,
      logger: createMockLogger(),
    });
    expect(order).toEqual(['sent', 'closed']);
    await expect(result).resolves.toBeUndefined();
  });
});
