/**
 * Compile-time drift guard for core Config types.
 *
 * Each of the five core component Config types is authored in two places:
 *   - a hand-written TS interface in `packages/core/src/types/*.ts`
 *   - a Zod schema in `packages/core/src/schemas/*.ts`
 *
 * Adding a field to one side and forgetting the other used to slip through
 * code review (e.g. `before` / `next` / `cache` / `disabled` / `mock` landed
 * on `Destination.Config` in March 2026 but stayed missing from the Zod
 * schema for a month, breaking downstream MCP and website tooling).
 *
 * This file fails the TypeScript build if key sets of the TS Config types
 * drift from their Zod equivalents. Value types are intentionally NOT
 * checked — recursive Zod schemas (Routes, MatchExpression, Value) collapse
 * to `unknown` under `z.infer`, and generic slots (`settings`, `env`,
 * `mapping`) are parameterized in TS but loose in Zod. Checking keys alone
 * is enough to catch the "forgotten-to-update-both-sides" class of bug.
 *
 * To add a field: update BOTH the Zod schema AND the TS interface. The
 * guard has no opt-out for single-sided additions.
 *
 * To remove a field: remove from both sides.
 */
import type { z } from '../validation';

import type * as DestinationTypes from '../../types/destination';
import type * as SourceTypes from '../../types/source';
import type * as TransformerTypes from '../../types/transformer';
import type * as StoreTypes from '../../types/store';
import type * as CollectorTypes from '../../types/collector';

import type { ConfigSchema as DestConfigSchema } from '../destination';
import type { ConfigSchema as SourceConfigSchema } from '../source';
import type { ConfigSchema as TransformerConfigSchema } from '../transformer';
import type { ConfigSchema as StoreConfigSchema } from '../store';
import type {
  ConfigSchema as CollectorConfigSchema,
  InitConfigSchema as CollectorInitConfigSchema,
} from '../collector';

import type { Equal, Expect } from './type-utils';

// Destination
type _DestZodKeys = keyof z.infer<typeof DestConfigSchema>;
type _DestTsKeys = keyof DestinationTypes.Config;
type _destCheck = Expect<Equal<_DestZodKeys, _DestTsKeys>>;

// Source
type _SourceZodKeys = keyof z.infer<typeof SourceConfigSchema>;
type _SourceTsKeys = keyof SourceTypes.Config;
type _sourceCheck = Expect<Equal<_SourceZodKeys, _SourceTsKeys>>;

// Transformer
type _TransformerZodKeys = keyof z.infer<typeof TransformerConfigSchema>;
type _TransformerTsKeys = keyof TransformerTypes.Config;
type _transformerCheck = Expect<Equal<_TransformerZodKeys, _TransformerTsKeys>>;

// Store
type _StoreZodKeys = keyof z.infer<typeof StoreConfigSchema>;
type _StoreTsKeys = keyof StoreTypes.Config;
type _storeCheck = Expect<Equal<_StoreZodKeys, _StoreTsKeys>>;

// Collector.Config
type _CollectorConfigZodKeys = keyof z.infer<typeof CollectorConfigSchema>;
type _CollectorConfigTsKeys = keyof CollectorTypes.Config;
type _collectorConfigCheck = Expect<
  Equal<_CollectorConfigZodKeys, _CollectorConfigTsKeys>
>;

// Collector.InitConfig
type _CollectorInitConfigZodKeys = keyof z.infer<
  typeof CollectorInitConfigSchema
>;
type _CollectorInitConfigTsKeys = keyof CollectorTypes.InitConfig;
type _collectorInitConfigCheck = Expect<
  Equal<_CollectorInitConfigZodKeys, _CollectorInitConfigTsKeys>
>;
