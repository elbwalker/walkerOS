import { transformerRedact } from '../transformer';
import type { Transformer, WalkerOS } from '@walkeros/core';
import {
  clone,
  createMockContext,
  createMockLogger,
  isObject,
} from '@walkeros/core';
import type { Types } from '../types';
import { examples } from '../dev';

// Helper to create transformer context for testing
function createTransformerContext(
  config: Partial<Transformer.Config<Types>> = {},
) {
  return createMockContext<Types>({ config, id: 'test-redact' });
}

// The transformer instance (an init may return it as a promise)
async function createTransformer(
  config: Partial<Transformer.Config<Types>> = {},
) {
  return await transformerRedact(createTransformerContext(config));
}

// Helper to create push context for testing
function createPushContext() {
  return createMockContext<Types>({ id: 'test-redact' });
}

// A step example's `in` is `unknown`: narrow it to an event before pushing it
function isEvent(value: unknown): value is WalkerOS.DeepPartialEvent {
  return isObject(value) && typeof value.name === 'string';
}

describe('Redact Transformer', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  // Each step example: push its `in`, compare the literal return with `out`.
  // The examples share the settings step.ts states.
  test.each(Object.entries(examples.step))('%s', async (name, example) => {
    if (!isEvent(example.in)) throw new Error(`${name}: in is not an event`);
    const transformer = await createTransformer({
      settings: { fieldsToRedact: ['email'] },
    });

    const result = await transformer.push(
      clone(example.in),
      createPushContext(),
    );
    expect([['return', result]]).toEqual(example.out);
  });

  test('redacts specified fields from valid event', async () => {
    const transformer = await createTransformer({
      settings: { fieldsToRedact: ['email'] },
    });

    const event = clone(examples.events.validEvent);
    const pushContext = createPushContext();
    const result = await transformer.push(event, pushContext);

    // Narrow the Result union cast-free: a single Result carries `.event`.
    if (!result || Array.isArray(result)) throw new Error('expected an event');
    expect(result.event).toMatchObject(examples.events.processedEvent);
    expect(result.event?.data?.email).toBeUndefined();
  });

  test('passes through event when no fields match', async () => {
    const transformer = await createTransformer({
      settings: { fieldsToRedact: ['ssn'] },
    });

    const event = clone(examples.events.validEvent);
    const pushContext = createPushContext();
    const result = await transformer.push(event, pushContext);

    if (!result || Array.isArray(result)) throw new Error('expected an event');
    expect(result.event?.data?.email).toBe('user@example.com');
  });

  test('logs redactions when enabled', async () => {
    const transformer = await createTransformer({
      settings: {
        fieldsToRedact: ['email'],
        logRedactions: true,
      },
    });

    const event = clone(examples.events.validEvent);
    const pushContext = {
      ...createPushContext(),
      logger: mockLogger,
    };
    await transformer.push(event, pushContext);

    expect(mockLogger.debug).toHaveBeenCalledWith('Redacted field', {
      field: 'email',
    });
  });
});
