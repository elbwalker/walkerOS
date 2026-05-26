import type { Mapping } from '@walkeros/core';

/**
 * Input signal sources. Each is a Mapping.Value resolved via getMappingValue
 * against { event, ingest }.
 *
 * v1 only reads `userAgent`. The remaining fields are reserved for v1.1
 * (header consistency heuristics) so the public schema stays stable.
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
}

/**
 * Output paths. Empty string or omitted = skip writing that field.
 * Paths starting with `ingest.` route to context.ingest (pipeline scratch);
 * everything else routes to the event.
 */
export interface BotOutput {
  botScore?: string;
  agentScore?: string;
  agentProduct?: string;
}

export interface BotSettings {
  input?: BotInput;
  output?: BotOutput;
}
