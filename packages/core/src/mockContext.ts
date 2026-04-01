import type { Collector, Transformer, Destination, Ingest } from './types';
import { createIngest } from './types/ingest';
import { createMockLogger } from './mockLogger';

/**
 * Create a mock context for testing transformers and destinations.
 *
 * Provides sensible defaults for all required fields. Override only
 * what the test cares about. When context signatures change, only
 * this factory needs updating — not every test file.
 *
 * @example
 * ```typescript
 * // Transformer test — only specify config
 * const ctx = createMockContext({ config: { settings: { strict: true } } });
 * const result = await transformer.push(event, ctx);
 *
 * // Destination test — specify config and custom env
 * const ctx = createMockContext({ config: { settings: { url } }, env: { sendWeb } });
 * await destination.push(event, ctx);
 *
 * // With custom ingest data
 * const ctx = createMockContext({ ingest: { ...createIngest('test'), path: '/api' } });
 * ```
 */
export function createMockContext<
  T extends Transformer.TypesGeneric = Transformer.Types,
>(
  overrides: Partial<
    Omit<Transformer.Context<T>, 'config' | 'ingest'> & {
      config?: Transformer.Config<T> | Destination.Config<Destination.TypesGeneric>;
      ingest?: Ingest | (Record<string, unknown> & { _meta: Ingest['_meta'] });
      data?: unknown;
      rule?: unknown;
    }
  > = {},
): Transformer.Context<T> & Destination.PushContext<Destination.TypesGeneric> {
  return {
    collector: {} as Collector.Instance,
    config: {} as Transformer.Config<T>,
    env: {} as Transformer.Env<T>,
    logger: createMockLogger(),
    id: 'test',
    ingest: createIngest('test'),
    ...overrides,
  } as Transformer.Context<T> & Destination.PushContext<Destination.TypesGeneric>;
}
