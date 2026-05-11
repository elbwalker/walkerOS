import type { Flow, Transformer, WalkerOS } from '@walkeros/core';
import {
  createIngest,
  createMockContext,
  createMockLogger,
} from '@walkeros/core';
import { transformerGa4 } from '../transformer';
import type { GA4Request, GA4Settings } from '../types';
import { examples } from '../dev';

type GA4Types = Transformer.Types<GA4Settings>;

/**
 * Examples-as-tests for transformer-ga4.
 *
 * Step examples for source.before transformers have an unusual `in` shape:
 * not a walkerOS event but the raw `GA4Request` (`{ url, body? }`) that the
 * transformer reads from `ctx.ingest`. The runner translates that into a
 * mock context and asserts the resulting push payload matches `out`.
 *
 * `out` mirrors the validator pattern's `[['return', value], ...]` tuples:
 *   - single mapped event:  `[['return', event]]`
 *   - fan-out (N events):   `[['return', e1], ['return', e2], ...]`
 *   - dropped:              `[['return', false]]`
 */

function isGA4Request(input: unknown): input is GA4Request {
  if (typeof input !== 'object' || input === null) return false;
  const candidate = input as Record<string, unknown>;
  if (typeof candidate.url !== 'string') return false;
  if (candidate.body !== undefined && typeof candidate.body !== 'string') {
    return false;
  }
  return true;
}

type PushResult = Transformer.Result | Transformer.Result[] | false | void;

function effectsFromResult(result: PushResult): Flow.StepEffect[] {
  if (result === false) return [['return', false]];
  if (result === undefined) return [];
  if (Array.isArray(result)) {
    return result.map((item): Flow.StepEffect => {
      if (item.event !== undefined) return ['return', item.event];
      return ['return', item];
    });
  }
  if (result.event !== undefined) return [['return', result.event]];
  return [];
}

const emptyEvent: WalkerOS.DeepPartialEvent = {};

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    expect(isGA4Request(example.in)).toBe(true);
    if (!isGA4Request(example.in)) return; // type narrow

    const request = example.in;
    const logger = createMockLogger();
    const ctx = createMockContext<GA4Types>({
      config: {},
      logger,
      ingest: {
        ...createIngest('example'),
        url: request.url,
        ...(request.body !== undefined ? { body: request.body } : {}),
      },
    });

    const instance = await transformerGa4(ctx);
    const result = await instance.push(emptyEvent, ctx);
    const actual = effectsFromResult(result);
    expect(actual).toEqual(example.out);
  });
});
