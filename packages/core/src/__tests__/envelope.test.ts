import {
  toEventList,
  isBatchBody,
  batchResponse,
  pushResultToOutcome,
  acknowledge,
} from '../envelope';
import type { Elb } from '../types';

describe('toEventList', () => {
  it.each([
    ['one event object', { name: 'page view' }, [{ name: 'page view' }]],
    [
      'a batch envelope',
      { batch: [{ name: 'page view' }, { name: 'order complete' }] },
      [{ name: 'page view' }, { name: 'order complete' }],
    ],
    [
      'a bare array',
      [{ name: 'page view' }, { name: 'order complete' }],
      [{ name: 'page view' }, { name: 'order complete' }],
    ],
    ['an unparseable string body', 'not json', [{}]],
    ['no body', undefined, [{}]],
    ['a null body', null, [{}]],
  ])('%s', (_, body, expected) => {
    expect(toEventList(body)).toEqual(expected);
  });

  it('forwards a non-event object verbatim so a before chain can rewrite it', () => {
    expect(toEventList({ vendor: 'payload' })).toEqual([{ vendor: 'payload' }]);
  });

  it('treats a non-array batch key as an ordinary event field', () => {
    expect(toEventList({ name: 'page view', batch: 'x' })).toEqual([
      { name: 'page view', batch: 'x' },
    ]);
  });

  it('yields an empty list for an empty batch', () => {
    expect(toEventList({ batch: [] })).toEqual([]);
  });
});

describe('isBatchBody', () => {
  it.each([
    [
      'a batch envelope',
      { batch: [{ name: 'page view' }, { name: 'order complete' }] },
      true,
    ],
    [
      'a single-element batch envelope',
      { batch: [{ name: 'page view' }] },
      true,
    ],
    ['an empty batch envelope', { batch: [] }, true],
    ['a bare array', [{ name: 'page view' }, { name: 'order complete' }], true],
    ['a bare single-element array', [{ name: 'page view' }], true],
    ['one event object', { name: 'page view' }, false],
    ['a non-array batch key', { name: 'page view', batch: 'x' }, false],
    ['an unparseable string body', 'not json', false],
    ['no body', undefined, false],
  ])('%s -> %p', (_, body, expected) => {
    expect(isBatchBody(body)).toBe(expected);
  });
});

describe('batchResponse', () => {
  it('answers 200 with index aligned ids when every event succeeds', () => {
    expect(batchResponse([{ id: 'a' }, { id: 'b' }])).toEqual({
      status: 200,
      body: { success: true, processed: 2, ids: ['a', 'b'] },
    });
  });

  // Index alignment is the point: ids[i] must describe the caller's i-th event,
  // so an accepted event without an id is null rather than omitted.
  it('keeps ids aligned when an accepted event has no id', () => {
    expect(batchResponse([{ id: 'a' }, {}, { id: 'c' }]).body.ids).toEqual([
      'a',
      null,
      'c',
    ]);
  });

  it('answers 207 with per index errors on partial failure', () => {
    expect(batchResponse([{ id: 'a' }, { error: 'nope' }])).toEqual({
      status: 207,
      body: {
        success: false,
        processed: 1,
        failed: 1,
        errors: [{ index: 1, error: 'nope' }],
      },
    });
  });

  it('answers 200 with processed 0 for an empty batch', () => {
    expect(batchResponse([])).toEqual({
      status: 200,
      body: { success: true, processed: 0, ids: [] },
    });
  });
});

describe('pushResultToOutcome', () => {
  it.each([
    ['an accepted push', { ok: true, event: { id: 'a' } }, { id: 'a' }],
    ['a declined push', { ok: false, error: 'nope' }, { error: 'nope' }],
    [
      'an invalid push with no reason',
      { ok: false, invalid: true },
      { error: 'Invalid event' },
    ],
    [
      'a failed push with no reason',
      { ok: false },
      { error: 'Event was not processed' },
    ],
  ])('%s', (_, result, expected) => {
    expect(pushResultToOutcome(result)).toEqual(expected);
  });
});

describe('acknowledge', () => {
  const ref = (code: string, retryable: boolean) => ({
    type: 'api',
    reason: { code, message: code, retryable },
  });

  it.each<[string, Elb.PushResult, 'ack' | 'retry' | 'reject']>([
    ['invalid input', { ok: false, invalid: true }, 'reject'],
    ['a delivered event', { ok: true, done: { api: { type: 'api' } } }, 'ack'],
    [
      'a queued event',
      {
        ok: true,
        queued: {
          api: { type: 'api', reason: { code: 'batch', message: 'batched' } },
        },
      },
      'ack',
    ],
    [
      'deterministic failures only (ruling 1)',
      {
        ok: false,
        failed: { a: ref('config', false), b: ref('transport', false) },
      },
      'ack',
    ],
    [
      'one retryable failure among deterministic ones',
      {
        ok: false,
        failed: { a: ref('config', false), b: ref('timeout', true) },
      },
      'retry',
    ],
    [
      'a retryable reason without a failed entry',
      {
        ok: false,
        reason: { code: 'queue-full', message: 'full', retryable: true },
      },
      'retry',
    ],
    [
      'a deterministic reason without a failed entry',
      {
        ok: false,
        reason: {
          code: 'mapping',
          message: 'condition threw',
          retryable: false,
        },
      },
      'ack',
    ],
    [
      'an error text that names queue-full while the reason is mapping (strings are never read)',
      {
        ok: false,
        error: 'queue-full',
        reason: { code: 'mapping', message: 'queue-full', retryable: false },
      },
      'ack',
    ],
    ['a failure without any reason', { ok: false }, 'retry'],
    [
      'a failed entry without a reason',
      { ok: false, failed: { a: { type: 'api' } } },
      'retry',
    ],
  ])('%s', (_, result, expected) => {
    expect(acknowledge(result)).toBe(expected);
  });
});
