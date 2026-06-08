import type { Ingest, Transformer, WalkerOS } from '@walkeros/core';
import { createIngest, createMockContext, getByPath } from '@walkeros/core';
import { transformerValidate } from '../transformer';
import type { ValidateSettings } from '../types';

/** Reads a dot-path off ingest and returns it as an array if it is one. */
const issuesAt = (ingest: Ingest, path: string): unknown[] => {
  const value = getByPath(ingest, path);
  return Array.isArray(value) ? value : [];
};

type Types = Transformer.Types<ValidateSettings>;

const createInitContext = (config: Partial<Transformer.Config<Types>> = {}) =>
  createMockContext<Types>({ config, id: 'validate' });

const createPushContext = () =>
  createMockContext<Types>({
    id: 'validate',
    ingest: createIngest('test'),
  });

// Requires data.title (string); event must be name "page view".
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

const validEvent: WalkerOS.DeepPartialEvent = {
  name: 'page view',
  entity: 'page',
  action: 'view',
  data: { title: 'Home' },
};

const invalidEvent: WalkerOS.DeepPartialEvent = {
  name: 'page view',
  entity: 'page',
  action: 'view',
  data: {},
};

describe('transformerValidate', () => {
  test('type property is "validate"', async () => {
    const instance = await transformerValidate(createInitContext({}));
    expect(instance.type).toBe('validate');
  });

  test('valid event passes and writes source.valid = true', async () => {
    const instance = await transformerValidate(
      createInitContext({ settings: { contract: [pageContract] } }),
    );
    const result = await instance.push(validEvent, createPushContext());
    expect(result).not.toBe(false);
    expect(result).toMatchObject({ event: { source: { valid: true } } });
  });

  test('invalid event in strict mode drops (returns false) but still records ingest errors', async () => {
    const instance = await transformerValidate(
      createInitContext({
        settings: { contract: [pageContract], mode: 'strict' },
      }),
    );
    const ctx = createPushContext();
    const result = await instance.push(invalidEvent, ctx);
    expect(result).toBe(false);
    expect(issuesAt(ctx.ingest, 'validation').length).toBeGreaterThan(0);
  });

  test('invalid event in pass mode continues and annotates source.valid = false', async () => {
    const instance = await transformerValidate(
      createInitContext({
        settings: { contract: [pageContract], mode: 'pass' },
      }),
    );
    const ctx = createPushContext();
    const result = await instance.push(invalidEvent, ctx);
    expect(result).not.toBe(false);
    expect(result).toMatchObject({ event: { source: { valid: false } } });
    expect(issuesAt(ctx.ingest, 'validation').length).toBeGreaterThan(0);
  });

  test('pass mode is the default (no mode set continues on invalid)', async () => {
    const instance = await transformerValidate(
      createInitContext({ settings: { contract: [pageContract] } }),
    );
    const result = await instance.push(invalidEvent, createPushContext());
    expect(result).not.toBe(false);
    expect(result).toMatchObject({ event: { source: { valid: false } } });
  });

  test('custom output split: verdict at event.data.ok, errors at ingest.diag.problems', async () => {
    const instance = await transformerValidate(
      createInitContext({
        settings: {
          contract: [pageContract],
          output: { isValid: 'data.ok', errors: 'diag.problems' },
        },
      }),
    );
    const ctx = createPushContext();
    const result = await instance.push(invalidEvent, ctx);
    expect(result).toMatchObject({ event: { data: { ok: false } } });
    // default paths must NOT be written
    expect(result).not.toMatchObject({ event: { source: { valid: false } } });
    expect(getByPath(ctx.ingest, 'validation')).toBeUndefined();
    expect(issuesAt(ctx.ingest, 'diag.problems').length).toBeGreaterThan(0);
  });

  test('empty-string output paths skip both writes', async () => {
    const instance = await transformerValidate(
      createInitContext({
        settings: {
          contract: [pageContract],
          output: { isValid: '', errors: '' },
        },
      }),
    );
    const ctx = createPushContext();
    const result = await instance.push(validEvent, ctx);
    expect(result).not.toBe(false);
    // verdict skipped: no source.valid on the event
    expect(result).not.toMatchObject({ event: { source: expect.anything() } });
    // errors skipped: no validation list on the ingest
    expect(getByPath(ctx.ingest, 'validation')).toBeUndefined();
  });

  test('gtm filter via inline contract: strict drops gtm.* names, passes real events', async () => {
    const inlineContract = {
      type: 'object',
      properties: { name: { not: { pattern: '^gtm\\.' } } },
    };
    const instance = await transformerValidate(
      createInitContext({
        settings: { contract: [inlineContract], mode: 'strict' },
      }),
    );

    const gtmJs: WalkerOS.DeepPartialEvent = { name: 'gtm.js' };
    const gtmDom: WalkerOS.DeepPartialEvent = { name: 'gtm.dom' };
    const pageView: WalkerOS.DeepPartialEvent = {
      name: 'page view',
      entity: 'page',
      action: 'view',
    };

    expect(await instance.push(gtmJs, createPushContext())).toBe(false);
    expect(await instance.push(gtmDom, createPushContext())).toBe(false);
    const ok = await instance.push(pageView, createPushContext());
    expect(ok).not.toBe(false);
    expect(ok).toMatchObject({ event: { source: { valid: true } } });
  });

  test('format-only malformed event in pass mode annotates invalid', async () => {
    const instance = await transformerValidate(
      createInitContext({ settings: { format: true, mode: 'pass' } }),
    );
    // Canonical structural schema: a non-positive timestamp (must be an
    // integer > 0) fails. Missing fields would pass (all fields optional).
    const malformed: WalkerOS.DeepPartialEvent = {
      name: 'page view',
      entity: 'page',
      action: 'view',
      timestamp: -1,
    };
    const ctx = createPushContext();
    const result = await instance.push(malformed, ctx);
    expect(result).not.toBe(false);
    expect(result).toMatchObject({ event: { source: { valid: false } } });
    expect(issuesAt(ctx.ingest, 'validation').length).toBeGreaterThan(0);
  });
});
