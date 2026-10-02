import { ServiceUnavailableException } from '@aws-sdk/client-firehose';
import { createMockLogger } from '@walkeros/core';
import { deliver } from '../lib/deliver';
import { AwsDeliveryError } from '../../lib/errors';
import type { Answer } from './support';
import { STREAM, accepted, events, initialized, recordingEnv } from './support';
import { resolveSettings } from '../config';

async function setup(answer?: Answer) {
  const recording = recordingEnv(answer);
  const config = await initialized(
    { settings: { streamName: STREAM, region: 'eu-west-1' } },
    recording.env,
  );
  return { recording, settings: resolveSettings(config.settings) };
}

const items = (count: number) => events(count).map((event) => ({ event }));

function rejected(...local: number[]) {
  return (input: Parameters<Answer>[0]) => ({
    FailedPutCount: local.length,
    RequestResponses: (input.Records ?? []).map((_, i) =>
      local.includes(i)
        ? {
            ErrorCode: 'ServiceUnavailableException',
            ErrorMessage: 'Slow down.',
          }
        : { RecordId: `r-${i}` },
    ),
    $metadata: { httpStatusCode: 200, attempts: 1 },
  });
}

describe('deliver', () => {
  test.each([
    ['success', async (input: Parameters<Answer>[0]) => accepted(input)],
    [
      'partial failure',
      async (input: Parameters<Answer>[0]) => rejected(0)(input),
    ],
    [
      'whole-call failure',
      async () => {
        throw new ServiceUnavailableException({
          message: 'busy',
          $metadata: { httpStatusCode: 500, attempts: 3 },
        });
      },
    ],
  ])('sends each chunk exactly once on %s', async (_case, answer) => {
    const { recording, settings } = await setup(answer);
    await deliver(items(1200), settings, recording.env, createMockLogger());
    expect(recording.sends.map((s) => s.Records?.length)).toEqual([
      500, 500, 200,
    ]);
  });

  test('chunks go out concurrently', async () => {
    const releases: Array<() => void> = [];
    const { recording, settings } = await setup(
      (input) =>
        new Promise((resolve) => releases.push(() => resolve(accepted(input)))),
    );

    const delivering = deliver(
      items(1200),
      settings,
      recording.env,
      createMockLogger(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(recording.sends).toHaveLength(3);

    releases.forEach((release) => release());
    await expect(delivering).resolves.toEqual([]);
  });

  test('a failed chunk does not stop the others, and indices are global', async () => {
    const { recording, settings } = await setup(async (input, call) => {
      if (call === 0)
        throw new ServiceUnavailableException({
          message: 'busy',
          $metadata: { httpStatusCode: 500, attempts: 3 },
        });
      if (call === 1) return rejected(3)(input);
      return accepted(input);
    });

    const failures = await deliver(
      items(1200),
      settings,
      recording.env,
      createMockLogger(),
    );

    expect(recording.sends).toHaveLength(3);
    expect(failures.map(({ index }) => index)).toEqual([
      ...Array.from({ length: 500 }, (_, i) => i),
      503,
    ]);
    expect(failures[500].error).toMatchObject({
      code: 'ServiceUnavailableException',
      status: 200,
      retryable: true,
    });
  });

  test('a whole-call failure carries the decision 12 fields and the SDK cause', async () => {
    const sdkError = new ServiceUnavailableException({
      message: 'busy',
      $metadata: { httpStatusCode: 500, attempts: 3 },
    });
    const { recording, settings } = await setup(async () => {
      throw sdkError;
    });

    const [failure] = await deliver(
      items(1),
      settings,
      recording.env,
      createMockLogger(),
    );

    expect(failure.error).toBeInstanceOf(AwsDeliveryError);
    expect(failure.error).toMatchObject({
      code: 'ServiceUnavailableException',
      status: 500,
      retryable: true,
    });
    expect(failure.error.cause).toBe(sdkError);
    expect(failure.error.message).toContain(STREAM);
    expect(failure.error.message).toContain('eu-west-1');
  });

  test.each([
    ['no RequestResponses', { FailedPutCount: 1 }],
    [
      'misaligned RequestResponses',
      { FailedPutCount: 1, RequestResponses: [{}] },
    ],
    ['no answer at all', undefined],
    [
      'aligned entries that do not account for FailedPutCount',
      {
        FailedPutCount: 1,
        RequestResponses: [{ RecordId: 'a' }, { RecordId: 'b' }],
      },
    ],
  ])(
    'a 200 with %s fails its chunk as InvalidResponse',
    async (_case, answer) => {
      const { recording, settings } = await setup(async () => answer);
      const failures = await deliver(
        items(2),
        settings,
        recording.env,
        createMockLogger(),
      );
      expect(failures).toHaveLength(2);
      expect(failures[0].error).toMatchObject({
        code: 'InvalidResponse',
        retryable: true,
      });
    },
  );

  test('refused records are never sent', async () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const { recording, settings } = await setup();
    const list = items(3);
    const failures = await deliver(
      [list[0], { event: list[1].event, data: cyclic }, list[2]],
      settings,
      recording.env,
      createMockLogger(),
    );
    expect(recording.sends[0].Records).toHaveLength(2);
    expect(failures).toEqual([
      {
        index: 1,
        error: expect.objectContaining({
          code: 'InvalidRecord',
          retryable: false,
        }),
      },
    ]);
  });

  test('no error logs; one debug line per call with SDK attempts', async () => {
    const logger = createMockLogger();
    const { recording, settings } = await setup(async () => {
      throw new ServiceUnavailableException({
        message: 'busy',
        $metadata: { httpStatusCode: 500, attempts: 3 },
      });
    });
    await deliver(items(2), settings, recording.env, logger);

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'Firehose PutRecordBatch',
      expect.objectContaining({
        stream: STREAM,
        records: 2,
        failed: 2,
        attempts: 3,
        bytes: expect.any(Number),
        ms: expect.any(Number),
      }),
    );
  });
});
