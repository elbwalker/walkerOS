/**
 * Typed re-exports of bundled example flow configurations.
 *
 * Importing JSON files via `resolveJsonModule` produces a deeply structural
 * type whose literals are widened (`version: number` instead of `4`,
 * `platform: string` instead of `'web' | 'server'`). That widened shape is
 * not assignable to `Flow.Json` and forces every consumer to cast away to
 * `Record<string, unknown>`, losing all type information about the example.
 *
 * Routing the imports through `validateFlowConfig` (a real type guard backed
 * by the canonical Zod schema in `@walkeros/core`) launders the JSON into a
 * proper `Flow.Json` value with no `as` cast at any call site:
 *
 *   - The Zod parser checks the structure at module load time. If an example
 *     drifts away from the schema, the package fails to load loudly instead
 *     of producing a silently broken value.
 *   - The return type is `Flow.Json` (the canonical interface), not the Zod
 *     inferred shape, because `validateFlowConfig` uses `isFlowConfig` as a
 *     `data is Flow.Json` type predicate.
 *
 * Pattern choice (`: Flow.Json` annotation via runtime validator) was picked
 * over `satisfies Flow.Json` and `as const satisfies Flow.Json` because:
 *
 *   - `: Flow.Json` annotation alone fails: the JSON's widened literals do
 *     not satisfy the literal constraints (`version: 4`, platform unions).
 *   - `satisfies Flow.Json` fails for the same reason.
 *   - `as const satisfies Flow.Json` cannot be applied to a JSON import
 *     (TypeScript does not support `as const` on imported values).
 *   - A wrapper-function or runtime-validator approach is the only pattern
 *     that produces a `Flow.Json`-typed value without an `as` cast anywhere
 *     in the chain. It also gives consumers a load-time correctness check
 *     for free.
 *
 * Cost: one Zod parse per example at module init. Examples are loaded by
 * tests, MCP servers, and dev seed scripts. None are perf-critical.
 */

import { validateFlowConfig } from '../config/validators.js';

import flowCompleteImport from '../../examples/flow-complete.json';
import flowSimpleImport from '../../examples/flow-simple.json';

export const flowComplete = validateFlowConfig(flowCompleteImport);
export const flowSimple = validateFlowConfig(flowSimpleImport);
