import type { Transformer, WalkerOS } from '@walkeros/core';
import { createIngest, createMockContext } from '@walkeros/core';
import { transformerValidate } from '../transformer';
import type { ValidateSettings } from '../types';
import * as step from '../examples/step';

type Types = Transformer.Types<ValidateSettings>;

/** Requires data.title (string) on a "page view" event. */
const pageContract = {
  events: {
    page: {
      view: {
        type: 'object',
        required: ['name', 'data'],
        properties: {
          name: { type: 'string', const: 'page view' },
          data: {
            type: 'object',
            required: ['title'],
            properties: { title: { type: 'string' } },
          },
        },
      },
    },
  },
};

/** Rejects any event whose name starts with "gtm.". */
const noGtmContract = {
  type: 'object',
  properties: { name: { not: { pattern: '^gtm\\.' } } },
};

/**
 * Per-example transformer settings. StepExample carries no config slot, so the
 * harness keys off the example name (same shape the bot transformer test uses
 * for its per-example User-Agent headers).
 */
const settingsByExample: Record<string, ValidateSettings> = {
  strictValidPageView: { contract: [pageContract], mode: 'strict' },
  strictInvalidPageView: { contract: [pageContract], mode: 'strict' },
  passAnnotateInvalid: { contract: [pageContract], mode: 'pass' },
  gtmFilterDropped: { contract: [noGtmContract], mode: 'strict' },
  gtmFilterPasses: { contract: [noGtmContract], mode: 'strict' },
};

describe('validate transformer step examples', () => {
  const cases = Object.entries(step) as Array<
    [string, (typeof step)[keyof typeof step]]
  >;

  it.each(cases)('%s', async (name, example) => {
    const settings = settingsByExample[name];
    if (!settings) {
      throw new Error(`no settings registered for example "${name}"`);
    }

    const instance = await transformerValidate(
      createMockContext<Types>({ id: 'validate', config: { settings } }),
    );
    const ctx = createMockContext<Types>({
      id: 'validate',
      ingest: createIngest('test'),
    });
    const result = await instance.push(
      example.in as WalkerOS.DeepPartialEvent,
      ctx,
    );

    // A dropped example is encoded as out: [['return', false]].
    if (result === false) {
      expect(example.out).toEqual([['return', false]]);
      return;
    }
    if (!result || Array.isArray(result)) {
      throw new Error(`expected a single Result for "${name}"`);
    }

    // Wrap to match Flow.StepExample.out shape: [['return', { event: {...} }]].
    const actual = [['return', { event: result.event }]];
    expect(actual).toEqual(example.out);
  });
});
