import { createEvent, createMockContext } from '@walkeros/core';
import destination from '../';
import { STREAM, id, initialized, recordTexts, recordingEnv } from './support';
import type { Answer } from './support';

async function pushWith(answer: Answer, data?: unknown) {
  const recording = recordingEnv(answer);
  const config = await initialized(
    { settings: { streamName: STREAM } },
    recording.env,
  );
  const event = createEvent();
  const pushing = destination.push(
    event,
    createMockContext({ config, env: recording.env, id, data }),
  );
  return { recording, event, pushing };
}

describe('Firehose push', () => {
  test('rejects when send rejects on a later tick', async () => {
    const { pushing } = await pushWith(
      () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('later failure')), 5),
        ),
    );
    await expect(pushing).rejects.toThrow('later failure');
  });

  test('does not resolve before its send resolves', async () => {
    let settled = false;
    const { pushing } = await pushWith(
      (input) =>
        new Promise((resolve) =>
          setTimeout(() => {
            settled = true;
            resolve({
              FailedPutCount: 0,
              RequestResponses: (input.Records ?? []).map(() => ({})),
            });
          }, 5),
        ),
    );
    await pushing;
    expect(settled).toBe(true);
  });

  test('sends the event as JSON plus a newline', async () => {
    const { recording, event, pushing } = await pushWith(async (input) => ({
      FailedPutCount: 0,
      RequestResponses: (input.Records ?? []).map(() => ({})),
    }));
    await pushing;
    expect(recording.sends).toHaveLength(1);
    expect(recording.sends[0].DeliveryStreamName).toBe(STREAM);
    expect(recordTexts(recording.sends[0])).toEqual([
      `${JSON.stringify(event)}\n`,
    ]);
  });

  test('sends mapped data instead of the event', async () => {
    const { recording, pushing } = await pushWith(
      async (input) => ({
        FailedPutCount: 0,
        RequestResponses: (input.Records ?? []).map(() => ({})),
      }),
      { id: 'mapped' },
    );
    await pushing;
    expect(recordTexts(recording.sends[0])).toEqual(['{"id":"mapped"}\n']);
  });

  test('a rejected record throws its error', async () => {
    const { pushing } = await pushWith(async () => ({
      FailedPutCount: 1,
      RequestResponses: [
        { ErrorCode: 'InternalFailure', ErrorMessage: 'Try again.' },
      ],
    }));
    await expect(pushing).rejects.toMatchObject({
      code: 'InternalFailure',
      retryable: true,
    });
  });
});
