import type { Mapping } from '@walkeros/core';
import type { BotContext } from './detect/context';

/**
 * Input signal sources. Each is a Mapping.Value resolved via getMappingValue
 * against { event, ingest }.
 *
 * `ja4` and `headerNames` are reserved: they are resolved and passed through,
 * but no heuristic consumes them.
 */
export interface BotInput {
  userAgent?: Mapping.Value;
  ip?: Mapping.Value;
  acceptLanguage?: Mapping.Value;
  acceptEncoding?: Mapping.Value;
  secFetchSite?: Mapping.Value;
  secFetchMode?: Mapping.Value;
  secFetchDest?: Mapping.Value;
  secFetchUser?: Mapping.Value;
  secChUa?: Mapping.Value;
  secChUaMobile?: Mapping.Value;
  secChUaPlatform?: Mapping.Value;
  accept?: Mapping.Value;
  contentType?: Mapping.Value;
  referer?: Mapping.Value;
  signatureAgent?: Mapping.Value;
  method?: Mapping.Value;
  ja4?: Mapping.Value;
  headerNames?: Mapping.Value;
}

/**
 * Output paths. `false` disables a field, any dot path renames and reroutes it.
 * Paths starting with `ingest.` route to context.ingest (pipeline scratch);
 * everything else routes to the event.
 */
export interface BotOutput {
  botScore?: string | false;
  botCategory?: string | false;
  botProduct?: string | false;
  botReasons?: string | false;
}

export interface BotSettings {
  input?: BotInput;
  output?: BotOutput;
  /**
   * How the request reached the collector. Pinning it is what enables the
   * context-dependent checks; `auto` runs the context-independent ones only.
   */
  context?: BotContext;
  /** Graded-layer cut between `human` and `suspicious`. */
  suspiciousAt?: number;
}
