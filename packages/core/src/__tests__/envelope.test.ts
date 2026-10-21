import {
  toEventList,
  isBatchBody,
  batchResponse,
  pushResultToOutcome,
  acknowledge,
} from '../envelope';
import type { EventOutcome } from '../envelope';
import { createEvent } from '../eventGenerator';
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
  const event = createEvent({ id: 'a' });
  const ref = (code: string, retryable: boolean) => ({
    type: 'api',
    reason: { code, message: `${code} at api`, retryable },
  });

  it.each<[string, Elb.PushResult, EventOutcome]>([
    ['a delivered push', { ok: true, event }, { id: 'a' }],
    [
      'a failure a resend cannot fix (ack: answered 200 with the id)',
      { ok: false, event, failed: { api: ref('config', false) } },
      { id: 'a' },
    ],
    [
      'a failure a resend could still deliver',
      { ok: false, event, failed: { api: ref('transport', true) } },
      { error: 'Event was not processed', status: 500 },
    ],
    [
      'a retryable transformer failure (its id and text stay in the log)',
      {
        ok: false,
        event,
        error: 'Transformer "enrich" failed: enrichment API answered 503',
        reason: { code: 'transport', message: 'answered 503', retryable: true },
      },
      { error: 'Event was not processed', status: 500 },
    ],
    [
      'a failure without any reason',
      { ok: false },
      { error: 'Event was not processed', status: 500 },
    ],
    [
      'invalid input, with the reason the producer can act on',
      { ok: false, invalid: true, error: 'Event name is invalid' },
      { error: 'Event name is invalid', status: 400 },
    ],
    [
      'invalid input with no reason',
      { ok: false, invalid: true },
      { error: 'Invalid event', status: 400 },
    ],
  ])('%s', (_, result, expected) => {
    expect(pushResultToOutcome(result)).toEqual(expected);
  });

  it('feeds the batch answer: a retryable failure makes it 207, no step named', () => {
    const { status, body } = batchResponse([
      pushResultToOutcome({ ok: true, event }),
      pushResultToOutcome({
        ok: false,
        event,
        error: 'Transformer "enrich" failed: enrichment API answered 503',
        reason: { code: 'transport', message: 'answered 503', retryable: true },
      }),
    ]);
    expect(status).toBe(207);
    expect(body.errors).toEqual([
      { index: 1, error: 'Event was not processed' },
    ]);
    expect(JSON.stringify(body)).not.toMatch(/enrich|503/);
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
