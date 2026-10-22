import { StepError } from '@walkeros/core';
import { batchOutcome } from '../batchOutcome';

const missing = new StepError('no identity', { code: 'missing-input' });
const down = new StepError('vendor down', { code: 'transport', status: 503 });
const rejected = new StepError('bad request', {
  code: 'transport',
  status: 400,
});

describe('batchOutcome', () => {
  it('resolves when nothing failed', () => {
    expect(batchOutcome(3, [])).toBeUndefined();
  });

  it('lists the failed entries when some landed', () => {
    const failed = [{ index: 1, error: down }];
    expect(batchOutcome(3, failed, new Error('send'))).toEqual({ failed });
  });

  it.each([
    [
      'the send error',
      [
        { index: 0, error: missing },
        { index: 1, error: down },
      ],
      new Error('send failed'),
      'send failed',
    ],
    [
      'the first retryable entry error',
      [
        { index: 0, error: missing },
        { index: 1, error: rejected },
        { index: 2, error: down },
      ],
      undefined,
      'vendor down',
    ],
    [
      'the first entry error when none is retryable',
      [
        { index: 0, error: missing },
        { index: 1, error: rejected },
      ],
      undefined,
      'no identity',
    ],
  ])('throws %s when nothing landed', (_name, failed, sendError, message) => {
    expect(() => batchOutcome(failed.length, failed, sendError)).toThrow(
      message,
    );
  });

  it('throws a transport failure for an entry that failed without an error', () => {
    expect(() => batchOutcome(1, [{ index: 0 }])).toThrow(
      expect.objectContaining({ code: 'transport', retryable: true }),
    );
  });
});
