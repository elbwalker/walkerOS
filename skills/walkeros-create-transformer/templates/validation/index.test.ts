import { transformerRedact } from '../transformer';
import type { Transformer } from '@walkeros/core';
import { createMockContext, createMockLogger } from '@walkeros/core';
import type { Types } from '../types';
import { examples } from '../dev';

// Helper to create transformer context for testing
function createTransformerContext(
  config: Partial<Transformer.Config<Types>> = {},
) {
  return createMockContext<Types>({ config, id: 'test-redact' });
}

// Helper to create push context for testing
function createPushContext() {
  return createMockContext<Types>({ id: 'test-redact' });
}

describe('Redact Transformer', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  test('redacts specified fields from valid event', () => {
    const transformer = transformerRedact(
      createTransformerContext({
        settings: { fieldsToRedact: ['email'] },
      }),
    );

    const event = structuredClone(examples.events.validEvent);
    const pushContext = createPushContext();
    const result = transformer.push(event, pushContext);

    // Narrow the Result union cast-free: a single Result carries `.event`.
    if (!result || Array.isArray(result)) throw new Error('expected an event');
    expect(result.event).toMatchObject(examples.events.processedEvent);
    expect(result.event?.data?.email).toBeUndefined();
  });

  test('passes through event when no fields match', () => {
    const transformer = transformerRedact(
      createTransformerContext({
        settings: { fieldsToRedact: ['ssn'] },
      }),
    );

    const event = structuredClone(examples.events.validEvent);
    const pushContext = createPushContext();
    const result = transformer.push(event, pushContext);

    if (!result || Array.isArray(result)) throw new Error('expected an event');
    expect(result.event?.data?.email).toBe('user@example.com');
  });

  test('logs redactions when enabled', () => {
    const transformer = transformerRedact(
      createTransformerContext({
        settings: {
          fieldsToRedact: ['email'],
          logRedactions: true,
        },
      }),
    );

    const event = structuredClone(examples.events.validEvent);
    const pushContext = {
      ...createPushContext(),
      logger: mockLogger,
    };
    transformer.push(event, pushContext);

    expect(mockLogger.debug).toHaveBeenCalledWith('Redacted field', {
      field: 'email',
    });
  });
});
