import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

/**
 * Settings (destination-level).
 *
 * orgId is the FullStory organization ID (e.g. "o-XXXXXX-na1").
 * All SnippetOptions from @fullstory/browser are available as passthrough.
 */
export interface Settings {
  orgId: string;
  host?: string;
  script?: string;
  cookieDomain?: string;
  debug?: boolean;
  devMode?: boolean;
  startCaptureManually?: boolean;
  namespace?: string;
  recordCrossDomainIFrames?: boolean;
  identify?: WalkerOSMapping.Value;
  consent?: Record<string, 'capture' | 'consent'>;
}

export type InitSettings = Partial<Settings>;

/**
 * Mapping (rule.settings) -- per-event overrides.
 *
 * identify -- mapping value resolving to { uid, properties? } for FullStory('setIdentity', ...)
 * set      -- mapping value resolving to properties for FullStory('setProperties', ...)
 * setType  -- property scope: 'user' (default) or 'page'
 */
export interface Mapping {
  identify?: WalkerOSMapping.Value;
  set?: WalkerOSMapping.Value;
  setType?: 'user' | 'page';
}

/**
 * FullStory SDK surface -- the subset of @fullstory/browser methods this
 * destination actually calls. Tests can mock each method individually.
 *
 * Uses V2 API only: FullStory('operationName', options).
 */
export interface FullStorySDK {
  init: (options: {
    orgId: string;
    host?: string;
    script?: string;
    cookieDomain?: string;
    debug?: boolean;
    devMode?: boolean;
    startCaptureManually?: boolean;
    namespace?: string;
    recordCrossDomainIFrames?: boolean;
  }) => void;
  trackEvent: (options: {
    name: string;
    properties?: Record<string, unknown>;
  }) => void;
  setIdentity: (options: {
    uid?: string | false;
    anonymous?: boolean;
    consent?: boolean;
    properties?: Record<string, unknown>;
  }) => void;
  setProperties: (options: {
    type: 'user' | 'page';
    properties: Record<string, unknown>;
  }) => void;
  shutdown: () => void;
  start: () => void;
}

/**
 * Env -- optional override for the vendor SDK. Production leaves this
 * undefined and the destination falls back to the real @fullstory/browser.
 * Tests provide a mock via env.fullstory = { ... }.
 */
export interface Env extends DestinationWeb.Env {
  fullstory?: FullStorySDK;
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
