import type { Collector, Transformer, Destination } from './types';
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
  T extends { settings: any; initSettings: any; env: any } = Transformer.Types,
>(
  overrides: Partial<
    Omit<Transformer.Context<T>, 'config' | 'ingest'> & {
      config?: Transformer.Config<T> | Destination.Config<any>;
      ingest?: unknown;
      data?: unknown;
      rule?: unknown;
    }
  > = {},
): Transformer.Context<T> & Destination.PushContext<any> {
  return {
    collector: {} as Collector.Instance,
    config: {} as any,
    env: {} as any,
    logger: createMockLogger(),
    id: 'test',
    ingest: createIngest('test'),
    ...overrides,
  } as Transformer.Context<T> & Destination.PushContext<any>;
}
