import { transformerRedact } from '../transformer';
import type { Transformer, Collector } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import type { Types } from '../types';
import { examples } from '../dev';

// Helper to create transformer context for testing
function createTransformerContext(
  config: Partial<Transformer.Config<Types>> = {},
): Transformer.Context<Types> {
  return {
    config,
    env: {} as Types['env'],
    logger: createMockLogger(),
    id: 'test-redact',
    collector: {} as Collector.Instance,
  };
}

// Helper to create push context for testing
function createPushContext(): Transformer.Context<Types> {
  return {
    config: {},
    env: {} as Types['env'],
    logger: createMockLogger(),
    id: 'test-redact',
    collector: {} as Collector.Instance,
  };
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

    expect(result).toMatchObject(examples.events.processedEvent);
    expect((result as any).data.email).toBeUndefined();
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

    expect((result as any).data.email).toBe('user@example.com');
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
