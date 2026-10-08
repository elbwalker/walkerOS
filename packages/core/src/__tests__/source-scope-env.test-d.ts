/**
 * Compile-time contract pin for `Source.ScopeEnv` and `Source.Context.withScope`.
 *
 * `withScope` is the public per-request entry point for server sources.
 * Removing or renaming it (or the ScopeEnv shape) is a breaking change to
 * the public source API and would slip past the test runner unless this
 * file fails to compile.
 */
import type { Collector, Ingest, Source } from '../types';
import type { RespondFn } from '../respond';
import type { IsExactly, Expect } from '../schemas/__tests__/type-utils';

// ScopeEnv carries a per-scope push, ingest, and optional respond.
type _ScopePush = Expect<IsExactly<Source.ScopeEnv['push'], Collector.PushFn>>;
type _ScopeIngest = Expect<IsExactly<Source.ScopeEnv['ingest'], Ingest>>;
type _ScopeRespond = Expect<
  IsExactly<Source.ScopeEnv['respond'], RespondFn | undefined>
>;

// withScope returns the body's return type as a Promise.
declare const ctx: Source.Context;
type WithScopeReturn = ReturnType<typeof ctx.withScope<'sentinel'>>;
type _WithScopeReturnsPromise = Expect<
  IsExactly<WithScopeReturn, Promise<'sentinel'>>
>;

void (null as unknown as _ScopePush);
void (null as unknown as _ScopeIngest);
void (null as unknown as _ScopeRespond);
void (null as unknown as _WithScopeReturnsPromise);
